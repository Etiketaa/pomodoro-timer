<script lang="ts">
  type Task = {
    id: string;
    title: string;
    status: 'todo' | 'doing' | 'done';
    date?: string;
  };

  const COLUMNS: { id: Task['status']; label: string }[] = [
    { id: 'todo', label: 'Por hacer' },
    { id: 'doing', label: 'En proceso' },
    { id: 'done', label: 'Hecho' },
  ];

  const ORDER: Task['status'][] = ['todo', 'doing', 'done'];

  let tasks = $state<Task[]>(loadTasks());
  let draft = $state('');
  let activeTab = $state<Task['status']>('todo');

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
    const title = draft.trim();
    if (!title) return;
    tasks = [...tasks, { id: crypto.randomUUID(), title, status: 'todo' }];
    draft = '';
    saveTasks();
  }

  function move(id: string, dir: 1 | -1) {
    tasks = tasks.map(t => {
      if (t.id !== id) return t;
      const idx = ORDER.indexOf(t.status);
      const next = ORDER[Math.min(ORDER.length - 1, Math.max(0, idx + dir))];
      return { ...t, status: next };
    });
    saveTasks();
  }

  function remove(id: string) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
  }

  const grouped = $derived(
    COLUMNS.reduce<Record<Task['status'], Task[]>>((acc, col) => {
      acc[col.id] = tasks.filter(t => t.status === col.id);
      return acc;
    }, { todo: [], doing: [], done: [] })
  );
</script>

<section aria-label="Tablero de tareas" class="flex w-full flex-col gap-4">
  <!-- Add task -->
  <div class="flex items-center gap-2">
    <input
      class="h-11 flex-1 rounded-xl border border-border bg-card/60 px-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      type="text"
      placeholder="Añadí una tarea y presioná Enter"
      aria-label="Nueva tarea"
      bind:value={draft}
      onkeydown={(e) => { if (e.key === 'Enter') addTask(); }}
    />
    <button
      class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      onclick={addTask}
      aria-label="Agregar tarea"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>
  </div>

  <!-- Mobile tab switcher -->
  <div
    role="tablist"
    aria-label="Estado de tareas"
    class="flex items-center gap-1 rounded-full border border-border bg-card/60 p-1 md:hidden"
  >
    {#each COLUMNS as col}
      <button
        role="tab"
        aria-selected={col.id === activeTab}
        class="flex-1 rounded-full px-2 py-2 text-xs font-medium transition-colors
               {col.id === activeTab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}"
        onclick={() => activeTab = col.id}
      >
        {col.label}
        <span class="ml-1 opacity-70">{grouped[col.id].length}</span>
      </button>
    {/each}
  </div>

  <!-- Columns -->
  <div class="grid gap-4 md:grid-cols-3">
    {#each COLUMNS as col}
      <div
        class="flex-col gap-3 rounded-2xl border border-border bg-card/40 p-3
               {activeTab === col.id ? 'flex' : 'hidden'}
               md:flex"
      >
        <!-- Column header (desktop only) -->
        <div class="hidden items-center justify-between px-1 md:flex">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {col.label}
          </h3>
          <span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {grouped[col.id].length}
          </span>
        </div>

        {#if grouped[col.id].length === 0}
          <div class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/>
            </svg>
            <p class="text-xs text-muted-foreground">
              {col.id === 'todo' ? 'Sin tareas aún — añadí una arriba' : 'Nada por acá todavía'}
            </p>
          </div>
        {:else}
          {#each grouped[col.id] as task (task.id)}
            <article class="group flex items-start gap-2 rounded-xl border border-border bg-card p-3">
              <span
                class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border
                       {task.status === 'done' ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}"
              >
                {#if task.status === 'done'}
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                {/if}
              </span>

              <div class="flex-1 min-w-0">
                <p class="text-sm leading-relaxed
                          {task.status === 'done' ? 'text-muted-foreground line-through' : ''}">
                  {task.title}
                </p>
                {#if task.date}
                  <span class="inline-flex items-center gap-1 mt-1 rounded-full bg-accent/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {new Date(task.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  </span>
                {/if}
              </div>

              <div class="flex shrink-0 items-center gap-0.5">
                <button
                  class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  onclick={() => move(task.id, -1)}
                  disabled={task.status === 'todo'}
                  aria-label="Mover a la etapa anterior"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                <button
                  class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  onclick={() => move(task.id, 1)}
                  disabled={task.status === 'done'}
                  aria-label="Mover a la etapa siguiente"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
                <button
                  class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  onclick={() => remove(task.id)}
                  aria-label="Eliminar tarea"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </article>
          {/each}
        {/if}
      </div>
    {/each}
  </div>
</section>
