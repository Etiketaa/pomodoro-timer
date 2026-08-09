<script lang="ts">
  type Task = {
    id: string;
    title: string;
    status: 'todo' | 'doing' | 'done';
    date?: string;
  };

  let tasks = $state<Task[]>(loadTasks());
  let view = $state<'month' | 'week'>('month');
  let current = $state(new Date());
  let selectedDate = $state<string | null>(null);
  let draft = $state('');

  function loadTasks(): Task[] {
    try {
      return JSON.parse(localStorage.getItem('pomodoroTasks') || '[]');
    } catch { return []; }
  }

  function saveTasks() {
    localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function fmt(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  function startOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  function daysInMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }

  function prevMonth() {
    current = new Date(current.getFullYear(), current.getMonth() - 1, 1);
  }

  function nextMonth() {
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }

  function prevWeek() {
    const d = new Date(current);
    d.setDate(d.getDate() - 7);
    current = d;
  }

  function nextWeek() {
    const d = new Date(current);
    d.setDate(d.getDate() + 7);
    current = d;
  }

  const monthLabel = $derived(
    current.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  );

  const weekLabel = $derived(() => {
    const d = new Date(current);
    const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - dayOfWeek);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmtShort = (dt: Date) => dt.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    return `${fmtShort(monday)} — ${fmtShort(sunday)}`;
  });

  const calendarDays = $derived(() => {
    const first = startOfMonth(current);
    const total = daysInMonth(current);
    const startDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
    const cells: { date: string; day: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

    const prev = new Date(current.getFullYear(), current.getMonth(), 0);
    for (let i = startDay - 1; i >= 0; i--) {
      const d = prev.getDate() - i;
      const dt = new Date(current.getFullYear(), current.getMonth() - 1, d);
      cells.push({ date: fmt(dt), day: d, isCurrentMonth: false, isToday: false });
    }

    for (let d = 1; d <= total; d++) {
      const dt = new Date(current.getFullYear(), current.getMonth(), d);
      cells.push({ date: fmt(dt), day: d, isCurrentMonth: true, isToday: fmt(dt) === todayStr() });
    }

    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const dt = new Date(current.getFullYear(), current.getMonth() + 1, d);
      cells.push({ date: fmt(dt), day: d, isCurrentMonth: false, isToday: false });
    }

    return cells;
  });

  const weekDays = $derived(() => {
    const d = new Date(current);
    const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - dayOfWeek);
    monday.setHours(0, 0, 0, 0);

    const days: { date: string; label: string; dayNum: number; isToday: boolean }[] = [];
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    for (let i = 0; i < 7; i++) {
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + i);
      days.push({
        date: fmt(dt),
        label: dayNames[i],
        dayNum: dt.getDate(),
        isToday: fmt(dt) === todayStr(),
      });
    }
    return days;
  });

  function tasksForDate(date: string): Task[] {
    return tasks.filter(t => t.date === date);
  }

  function tasksForWeek(): { date: string; tasks: Task[] }[] {
    return weekDays().map(d => ({ date: d.date, tasks: tasksForDate(d.date) }));
  }

  const selectedTasks = $derived(selectedDate ? tasksForDate(selectedDate) : []);

  const unassignedTasks = $derived(tasks.filter(t => !t.date));

  function assignTask(taskId: string, date: string) {
    tasks = tasks.map(t => t.id === taskId ? { ...t, date } : t);
    saveTasks();
  }

  function unassignTask(taskId: string) {
    tasks = tasks.map(t => t.id === taskId ? { ...t, date: undefined } : t);
    saveTasks();
  }

  function addTaskForDate() {
    const title = draft.trim();
    if (!title || !selectedDate) return;
    tasks = [...tasks, { id: crypto.randomUUID(), title, status: 'todo', date: selectedDate }];
    draft = '';
    saveTasks();
  }

  function statusColor(status: Task['status']) {
    if (status === 'done') return 'bg-primary';
    if (status === 'doing') return 'bg-accent';
    return 'bg-muted-foreground';
  }

  function selectDate(date: string) {
    selectedDate = selectedDate === date ? null : date;
  }
</script>

<section aria-label="Calendario" class="flex flex-col gap-4">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <button
        class="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
        onclick={view === 'month' ? prevMonth : prevWeek}
        aria-label="Anterior"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <h2 class="text-sm font-semibold min-w-[160px] text-center">
        {view === 'month' ? monthLabel : weekLabel()}
      </h2>
      <button
        class="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
        onclick={view === 'month' ? nextMonth : nextWeek}
        aria-label="Siguiente"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
    <div class="flex items-center gap-1 rounded-full border border-border bg-card/60 p-0.5">
      <button
        class="rounded-full px-3 py-1 text-xs font-medium transition-colors {view === 'month' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}"
        onclick={() => view = 'month'}
      >Mes</button>
      <button
        class="rounded-full px-3 py-1 text-xs font-medium transition-colors {view === 'week' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}"
        onclick={() => view = 'week'}
      >Semana</button>
    </div>
  </div>

  {#if view === 'month'}
    <!-- Month grid -->
    <div class="grid grid-cols-7 gap-px rounded-2xl border border-border bg-border overflow-hidden">
      {#each ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as dayName}
        <div class="bg-card/80 px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {dayName}
        </div>
      {/each}
      {#each calendarDays() as cell}
        {@const dayTasks = tasksForDate(cell.date)}
        <button
          class="relative flex flex-col items-center gap-1 bg-card/40 px-1 py-2 min-h-[52px] transition-colors
                 {cell.isCurrentMonth ? '' : 'opacity-30'}
                 {cell.isToday ? 'ring-1 ring-inset ring-primary/40' : ''}
                 {selectedDate === cell.date ? 'bg-accent/40' : 'hover:bg-card/70'}"
          onclick={() => selectDate(cell.date)}
        >
          <span class="text-xs {cell.isToday ? 'font-bold text-primary' : cell.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}">
            {cell.day}
          </span>
          {#if dayTasks.length > 0}
            <div class="flex gap-0.5 flex-wrap justify-center">
              {#each dayTasks.slice(0, 4) as t}
                <span class="h-1.5 w-1.5 rounded-full {statusColor(t.status)}"></span>
              {/each}
              {#if dayTasks.length > 4}
                <span class="text-[8px] text-muted-foreground">+{dayTasks.length - 4}</span>
              {/if}
            </div>
          {/if}
        </button>
      {/each}
    </div>

  {:else}
    <!-- Week view -->
    <div class="flex flex-col gap-2 rounded-2xl border border-border bg-card/40 p-3">
      {#each weekDays() as day}
        {@const dayTasks = tasksForDate(day.date)}
        <button
          class="flex items-start gap-3 rounded-xl px-3 py-2 transition-colors text-left
                 {day.isToday ? 'bg-accent/30 ring-1 ring-inset ring-primary/30' : 'hover:bg-card/60'}
                 {selectedDate === day.date ? 'bg-accent/50' : ''}"
          onclick={() => selectDate(day.date)}
        >
          <div class="flex flex-col items-center min-w-[36px]">
            <span class="text-[10px] uppercase tracking-wider {day.isToday ? 'text-primary font-bold' : 'text-muted-foreground'}">
              {day.label}
            </span>
            <span class="text-sm font-semibold {day.isToday ? 'text-primary' : 'text-foreground'}">
              {day.dayNum}
            </span>
          </div>
          <div class="flex-1 min-h-[24px]">
            {#if dayTasks.length === 0}
              <p class="text-xs text-muted-foreground/50 py-1">Sin tareas</p>
            {:else}
              <div class="flex flex-col gap-1">
                {#each dayTasks as t}
                  <div class="flex items-center gap-2">
                    <span class="h-1.5 w-1.5 rounded-full shrink-0 {statusColor(t.status)}"></span>
                    <span class="text-xs {t.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'} truncate">
                      {t.title}
                    </span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  {/if}

  <!-- Selected date detail -->
  {#if selectedDate}
    {@const dayTasks = tasksForDate(selectedDate)}
    <div class="rounded-2xl border border-border bg-card/40 p-4 animate-scaleIn">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold">
          {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h3>
        <span class="text-xs text-muted-foreground">{dayTasks.length} tarea{dayTasks.length !== 1 ? 's' : ''}</span>
      </div>

      {#if dayTasks.length > 0}
        <div class="flex flex-col gap-2 mb-3">
          {#each dayTasks as t}
            <div class="flex items-center gap-2 rounded-lg bg-card/60 px-3 py-2">
              <span class="h-2 w-2 rounded-full shrink-0 {statusColor(t.status)}"></span>
              <span class="flex-1 text-sm {t.status === 'done' ? 'text-muted-foreground line-through' : ''}">{t.title}</span>
              <button
                class="text-xs text-muted-foreground hover:text-destructive transition-colors"
                onclick={() => unassignTask(t.id)}
              >quitar</button>
            </div>
          {/each}
        </div>
      {/if}

      {#if unassignedTasks.length > 0}
        <div class="border-t border-border pt-3">
          <p class="text-xs text-muted-foreground mb-2">Asignar tarea a este día:</p>
          <div class="flex flex-col gap-1 max-h-32 overflow-y-auto">
            {#each unassignedTasks as t}
              <button
                class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-left transition-colors hover:bg-card/60"
                onclick={() => assignTask(t.id, selectedDate)}
              >
                <span class="h-1.5 w-1.5 rounded-full shrink-0 {statusColor(t.status)}"></span>
                <span class="text-xs text-foreground truncate">{t.title}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-auto text-muted-foreground"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Add new task for this date -->
      <div class="border-t border-border pt-3 mt-3">
        <p class="text-xs text-muted-foreground mb-2">Crear tarea para este día:</p>
        <div class="flex items-center gap-2">
          <input
            class="h-9 flex-1 rounded-lg border border-border bg-card/60 px-3 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            type="text"
            placeholder="Nueva tarea..."
            bind:value={draft}
            onkeydown={(e) => { if (e.key === 'Enter') addTaskForDate(); }}
          />
          <button
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40"
            onclick={addTaskForDate}
            disabled={!draft.trim()}
            aria-label="Agregar tarea"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  {/if}
</section>
