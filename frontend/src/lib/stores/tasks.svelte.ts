export type Energy = 'high' | 'medium' | 'low';

export type Subtask = {
  id: string;
  title: string;
  done: boolean;
  estimatedMinutes?: number;
};

export type Task = {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
  date?: string; // YYYY-MM-DD
  energy?: Energy;
  subtasks?: Subtask[];
  parentId?: string; // para subtareas generadas
  createdAt: string; // ISO
  completedAt?: string; // ISO
};

export type DailyNote = {
  date: string; // YYYY-MM-DD
  content: string; // markdown/plain text brain dump
  updatedAt: string;
};

export type ShutdownEntry = {
  date: string; // YYYY-MM-DD
  completedCount: number;
  whatWentWell: string;
  whatWasHard: string;
  tomorrowFocus: string;
  mood?: Energy; // cómo terminó el día
  createdAt: string;
};

export type StreakData = {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null; // YYYY-MM-DD
  history: string[]; // fechas YYYY-MM-DD donde se completó al menos 1 tarea
};

const TASKS_KEY = 'pomodoroTasksV2';
const NOTES_KEY = 'pomodoroDailyNotes';
const SHUTDOWN_KEY = 'pomodoroShutdown';
const STREAK_KEY = 'pomodoroStreak';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Migración: agregar campos nuevos si no existen
    return parsed.map((t: any) => ({
      ...t,
      energy: t.energy || 'medium',
      subtasks: t.subtasks || [],
      parentId: t.parentId,
      createdAt: t.createdAt || new Date().toISOString(),
      completedAt: t.completedAt,
    }));
  } catch {
    return [];
  }
}

function loadNotes(): Record<string, DailyNote> {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) || '{}');
  } catch {
    return {};
  }
}

function loadShutdown(): Record<string, ShutdownEntry> {
  try {
    return JSON.parse(localStorage.getItem(SHUTDOWN_KEY) || '{}');
  } catch {
    return {};
  }
}

function loadStreak(): StreakData {
  try {
    return JSON.parse(localStorage.getItem(STREAK_KEY) || '{"currentStreak":0,"longestStreak":0,"lastActiveDate":null,"history":[]}');
  } catch {
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: null, history: [] };
  }
}

function saveTasks(tasks: Task[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function saveNotes(notes: Record<string, DailyNote>) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

function saveShutdown(entries: Record<string, ShutdownEntry>) {
  localStorage.setItem(SHUTDOWN_KEY, JSON.stringify(entries));
}

function saveStreak(data: StreakData) {
  localStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

function updateStreakOnTaskComplete(tasks: Task[], streak: StreakData): StreakData {
  const today = todayStr();
  const completedToday = tasks.some(t => t.status === 'done' && t.completedAt?.startsWith(today));
  const completedYesterday = streak.lastActiveDate === getYesterdayStr();
  
  if (completedToday && streak.lastActiveDate !== today) {
    const newHistory = [...streak.history, today].slice(-365); // keep last year
    const newStreak = completedYesterday ? streak.currentStreak + 1 : 1;
    return {
      currentStreak: newStreak,
      longestStreak: Math.max(streak.longestStreak, newStreak),
      lastActiveDate: today,
      history: newHistory,
    };
  }
  return streak;
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function createTasksStore() {
  let tasks = $state<Task[]>(loadTasks());
  let notes = $state<Record<string, DailyNote>>(loadNotes());
  let shutdownEntries = $state<Record<string, ShutdownEntry>>(loadShutdown());
  let streak = $state<StreakData>(loadStreak());
  let energyFilter = $state<Energy | 'all'>('all');

  // Derived
  const grouped = $derived.by(() => {
    const filtered = energyFilter === 'all' 
      ? tasks 
      : tasks.filter(t => t.energy === energyFilter);
    
    return {
      todo: filtered.filter(t => t.status === 'todo' && !t.parentId),
      doing: filtered.filter(t => t.status === 'doing' && !t.parentId),
      done: filtered.filter(t => t.status === 'done' && !t.parentId),
      all: filtered.filter(t => !t.parentId), // solo tareas principales
    };
  });

  const todayNote = $derived.by(() => {
    const today = todayStr();
    return notes[today] || { date: today, content: '', updatedAt: new Date().toISOString() };
  });

  const todayShutdown = $derived.by(() => shutdownEntries[todayStr()]);

  const tasksWithSubtasks = $derived.by(() => {
    const map = new Map<string, Task>();
    tasks.forEach(t => map.set(t.id, t));
    return tasks.map(t => ({
      ...t,
      subtasks: t.subtasks?.map(st => ({ ...st })) || [],
      children: tasks.filter(c => c.parentId === t.id),
    }));
  });

  const completedTodayCount = $derived.by(() => {
    const today = todayStr();
    return tasks.filter(t => t.status === 'done' && t.completedAt?.startsWith(today)).length;
  });

  const stats = $derived.by(() => ({
    total: tasks.filter(t => !t.parentId).length,
    done: tasks.filter(t => t.status === 'done' && !t.parentId).length,
    doing: tasks.filter(t => t.status === 'doing' && !t.parentId).length,
    todo: tasks.filter(t => t.status === 'todo' && !t.parentId).length,
    byEnergy: {
      high: tasks.filter(t => t.energy === 'high' && !t.parentId).length,
      medium: tasks.filter(t => t.energy === 'medium' && !t.parentId).length,
      low: tasks.filter(t => t.energy === 'low' && !t.parentId).length,
    },
    streak: streak.currentStreak,
  }));

  // Actions
  function addTask(title: string, energy: Energy = 'medium', date?: string) {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      status: 'todo',
      energy,
      date,
      subtasks: [],
      createdAt: new Date().toISOString(),
    };
    tasks = [...tasks, newTask];
    saveTasks(tasks);
    return newTask.id;
  }

  function updateTask(id: string, updates: Partial<Task>) {
    tasks = tasks.map(t => t.id === id ? { ...t, ...updates } : t);
    saveTasks(tasks);
  }

  function moveTask(id: string, dir: 1 | -1) {
    const ORDER: Task['status'][] = ['todo', 'doing', 'done'];
    tasks = tasks.map(t => {
      if (t.id !== id) return t;
      const idx = ORDER.indexOf(t.status);
      const nextStatus = ORDER[Math.min(ORDER.length - 1, Math.max(0, idx + dir))];
      const updates: Partial<Task> = { status: nextStatus };
      if (nextStatus === 'done' && t.status !== 'done') {
        updates.completedAt = new Date().toISOString();
      }
      return { ...t, ...updates };
    });
    saveTasks(tasks);
    // Update streak if completed
    streak = updateStreakOnTaskComplete(tasks, streak);
    saveStreak(streak);
  }

  function removeTask(id: string) {
    // Also remove subtasks
    tasks = tasks.filter(t => t.id !== id && t.parentId !== id);
    saveTasks(tasks);
  }

  function splitTask(id: string, parts: string[]) {
    const parent = tasks.find(t => t.id === id);
    if (!parent) return;
    
    const subtasks: Subtask[] = parts.map(p => ({
      id: crypto.randomUUID(),
      title: p.trim(),
      done: false,
      estimatedMinutes: 10,
    }));
    
    // Update parent with subtasks
    updateTask(id, { subtasks });
    
    // Create child tasks for each part (optional - for Kanban visibility)
    parts.forEach((part, i) => {
      const childTask: Task = {
        id: crypto.randomUUID(),
        title: part.trim(),
        status: 'todo',
        energy: parent.energy || 'medium',
        date: parent.date,
        parentId: id,
        subtasks: [],
        createdAt: new Date().toISOString(),
      };
      tasks = [...tasks, childTask];
    });
    saveTasks(tasks);
  }

  function toggleSubtask(taskId: string, subtaskId: string) {
    tasks = tasks.map(t => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        subtasks: t.subtasks?.map(st => 
          st.id === subtaskId ? { ...st, done: !st.done } : st
        ) || [],
      };
    });
    saveTasks(tasks);
    
    // Auto-complete parent if all subtasks done
    const task = tasks.find(t => t.id === taskId);
    if (task?.subtasks && task.subtasks.every(st => st.done) && task.status !== 'done') {
      updateTask(taskId, { status: 'done', completedAt: new Date().toISOString() });
      streak = updateStreakOnTaskComplete(tasks, streak);
      saveStreak(streak);
    }
  }

  function setEnergyFilter(filter: Energy | 'all') {
    energyFilter = filter;
  }

  // Daily Note
  function updateDailyNote(content: string) {
    const today = todayStr();
    notes = {
      ...notes,
      [today]: {
        date: today,
        content,
        updatedAt: new Date().toISOString(),
      },
    };
    saveNotes(notes);
  }

  function getNote(date: string): DailyNote | undefined {
    return notes[date];
  }

  // Shutdown Ritual
  function saveShutdownEntry(entry: Omit<ShutdownEntry, 'date' | 'createdAt'>) {
    const today = todayStr();
    shutdownEntries = {
      ...shutdownEntries,
      [today]: {
        ...entry,
        date: today,
        createdAt: new Date().toISOString(),
      },
    };
    saveShutdown(shutdownEntries);
  }

  function getShutdownEntry(date: string): ShutdownEntry | undefined {
    return shutdownEntries[date];
  }

  // Streak helpers
  function getStreak() {
    return streak;
  }

  function resetStreak() {
    streak = { currentStreak: 0, longestStreak: 0, lastActiveDate: null, history: [] };
    saveStreak(streak);
  }

  return {
    get tasks() { return tasks; },
    get grouped() { return grouped; },
    get todayNote() { return todayNote; },
    get todayShutdown() { return todayShutdown; },
    get tasksWithSubtasks() { return tasksWithSubtasks; },
    get completedTodayCount() { return completedTodayCount; },
    get stats() { return stats; },
    get energyFilter() { return energyFilter; },
    get streak() { return streak; },
    
    addTask,
    updateTask,
    moveTask,
    removeTask,
    splitTask,
    toggleSubtask,
    setEnergyFilter,
    updateDailyNote,
    getNote,
    saveShutdownEntry,
    getShutdownEntry,
    getStreak,
    resetStreak,
  };
}

export type TasksStore = ReturnType<typeof createTasksStore>;