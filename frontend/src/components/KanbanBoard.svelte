<script lang="ts">
  type Task = {
    id: string;
    title: string;
    description: string;
    column: 'todo' | 'inProgress' | 'done';
    createdAt: number;
  };

  let tasks = $state<Task[]>(loadTasks());
  let draggedTaskId = $state<string | null>(null);
  let dragOverColumn = $state<string | null>(null);
  let newTaskTitle = $state('');
  let newTaskDesc = $state('');
  let showAddForm = $state(false);

  function loadTasks(): Task[] {
    try {
      return JSON.parse(localStorage.getItem('pomodoroTasks') || '[]');
    } catch {
      return [];
    }
  }

  function saveTasks() {
    localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
  }

  function addTask() {
    if (!newTaskTitle.trim()) return;
    tasks = [...tasks, {
      id: crypto.randomUUID(),
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim(),
      column: 'todo',
      createdAt: Date.now(),
    }];
    newTaskTitle = '';
    newTaskDesc = '';
    showAddForm = false;
    saveTasks();
  }

  function moveTask(taskId: string, toColumn: 'todo' | 'inProgress' | 'done') {
    tasks = tasks.map(t => t.id === taskId ? { ...t, column: toColumn } : t);
    saveTasks();
  }

  function deleteTask(taskId: string) {
    tasks = tasks.filter(t => t.id !== taskId);
    saveTasks();
  }

  function onDragStart(e: DragEvent, taskId: string) {
    draggedTaskId = taskId;
    e.dataTransfer!.effectAllowed = 'move';
  }

  function onDragOver(e: DragEvent, column: string) {
    e.preventDefault();
    dragOverColumn = column;
    e.dataTransfer!.dropEffect = 'move';
  }

  function onDragLeave() {
    dragOverColumn = null;
  }

  function onDrop(e: DragEvent, column: 'todo' | 'inProgress' | 'done') {
    e.preventDefault();
    dragOverColumn = null;
    if (draggedTaskId) {
      moveTask(draggedTaskId, column);
      draggedTaskId = null;
    }
  }

  const COLUMNS = [
    { id: 'todo', label: 'To Do', color: 'var(--primary)', icon: 'circle-dot' },
    { id: 'inProgress', label: 'In Progress', color: 'var(--accent-blue)', icon: 'loader' },
    { id: 'done', label: 'Done', color: 'var(--accent-green)', icon: 'circle-check' },
  ] as const;

  function columnTasks(col: string) {
    return tasks.filter(t => t.column === col);
  }

  function getRelativeTime(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }
</script>

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <h2 class="text-xl font-bold text-text">Tasks</h2>
      <p class="text-text-muted text-sm">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
    </div>
    <button
      class="btn btn-primary text-sm"
      onclick={() => showAddForm = !showAddForm}
    >
      {#if showAddForm}
        Cancel
      {:else}
        <span class="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Task
        </span>
      {/if}
    </button>
  </div>

  <!-- Add Task Form -->
  {#if showAddForm}
    <form class="card mb-4 space-y-3 animate-slideDown" onsubmit={(e) => { e.preventDefault(); addTask(); }}>
      <input
        class="input"
        type="text"
        placeholder="Task title..."
        bind:value={newTaskTitle}
      />
      <textarea
        class="input resize-none h-20"
        placeholder="Description (optional)..."
        bind:value={newTaskDesc}
      ></textarea>
      <button class="btn btn-primary w-full" type="submit" disabled={!newTaskTitle.trim()}>
        Create Task
      </button>
    </form>
  {/if}

  <!-- Kanban Columns -->
  <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0 overflow-hidden">
    {#each COLUMNS as col}
      <div
        class="flex flex-col rounded-xl border transition-all duration-200 min-h-[200px] {dragOverColumn === col.id ? 'border-primary/60' : 'border-border/30'}"
        style="border-color: {dragOverColumn === col.id ? col.color : ''};"
        ondragover={(e) => onDragOver(e, col.id)}
        ondragleave={onDragLeave}
        ondrop={(e) => onDrop(e, col.id as 'todo' | 'inProgress' | 'done')}
        role="region"
        aria-label={col.label}
      >
        <!-- Column Header -->
        <div class="flex items-center gap-2 px-4 py-3 border-b border-border/20">
          <div class="w-2 h-2 rounded-full" style="background: {col.color};"></div>
          <h3 class="text-sm font-semibold text-text uppercase tracking-wider">{col.label}</h3>
          <span class="ml-auto text-xs text-text-muted bg-bg-elevated px-2 py-0.5 rounded-full">
            {columnTasks(col.id).length}
          </span>
        </div>

        <!-- Tasks -->
        <div class="flex-1 p-3 space-y-2 overflow-y-auto scrollbar-thin">
          {#each columnTasks(col.id) as task (task.id)}
            <div
              class="card cursor-grab active:cursor-grabbing hover:border-primary/40 transition-all duration-200 group animate-fadeIn"
              class:opacity-40={draggedTaskId === task.id}
              draggable="true"
              role="listitem"
              ondragstart={(e) => onDragStart(e, task.id)}
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <h4 class="text-sm font-medium text-text truncate">{task.title}</h4>
                  {#if task.description}
                    <p class="text-xs text-text-muted mt-1 line-clamp-2">{task.description}</p>
                  {/if}
                </div>
                <button
                  class="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent-red/20 text-text-muted hover:text-accent-red shrink-0"
                  onclick={() => deleteTask(task.id)}
                  title="Delete task"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div class="flex items-center gap-2 mt-2">
                <span class="text-[10px] text-text-muted">{getRelativeTime(task.createdAt)}</span>
              </div>
            </div>
          {/each}

          {#if columnTasks(col.id).length === 0}
            <div class="flex flex-col items-center justify-center py-8 text-text-muted/50 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>
              </svg>
              <p class="text-xs mt-2">Drop tasks here</p>
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  .animate-slideDown { animation: slideDown 0.2s ease-out; }
  .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
  .scrollbar-thin::-webkit-scrollbar { width: 4px; }
  .scrollbar-thin::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
</style>