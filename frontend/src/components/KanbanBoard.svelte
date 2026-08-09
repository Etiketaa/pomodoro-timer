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
  let activeTab = $state<'todo' | 'inProgress' | 'done'>('todo');

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
      description: '',
      column: 'todo',
      createdAt: Date.now(),
    }];
    newTaskTitle = '';
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
    { id: 'todo' as const, label: 'Por hacer', emptyText: 'Sin tareas pendientes' },
    { id: 'inProgress' as const, label: 'En progreso', emptyText: 'Nada en progreso' },
    { id: 'done' as const, label: 'Hecho', emptyText: 'Nada completado aún' },
  ];

  function columnTasks(col: 'todo' | 'inProgress' | 'done') {
    return tasks.filter(t => t.column === col);
  }

  function getRelativeTime(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }
</script>

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="mb-4">
    <h2 class="text-lg font-bold">Tareas</h2>
    <p class="text-sm text-[var(--color-muted)]">{tasks.length} tarea{tasks.length !== 1 ? 's' : ''}</p>
  </div>

  <!-- Add task input (always visible) -->
  <form class="mb-4" onsubmit={(e) => { e.preventDefault(); addTask(); }}>
    <input
      class="input-field"
      type="text"
      placeholder="Añadí una tarea y presioná Enter"
      bind:value={newTaskTitle}
      aria-label="Nueva tarea"
    />
  </form>

  <!-- Mobile tabs -->
  <div class="flex gap-1 mb-4 md:hidden" role="tablist">
    {#each COLUMNS as col}
      <button
        role="tab"
        aria-selected={activeTab === col.id}
        class="tab flex-1"
        onclick={() => activeTab = col.id}
      >
        {col.label}
        <span class="ml-1 text-xs opacity-60">{columnTasks(col.id).length}</span>
      </button>
    {/each}
  </div>

  <!-- Mobile: single column view -->
  <div class="flex-1 md:hidden overflow-y-auto min-h-0">
    {#each COLUMNS.filter(c => c.id === activeTab) as col}
      <div
        class="min-h-[120px]"
        ondragover={(e) => onDragOver(e, col.id)}
        ondragleave={onDragLeave}
        ondrop={(e) => onDrop(e, col.id)}
        role="region"
        aria-label={col.label}
      >
        {#each columnTasks(col.id) as task (task.id)}
          <div
            class="card mb-2 cursor-grab active:cursor-grabbing transition-opacity group"
            class:opacity-40={draggedTaskId === task.id}
            draggable="true"
            role="listitem"
            ondragstart={(e) => onDragStart(e, task.id)}
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-medium truncate">{task.title}</h4>
                <span class="text-[10px] text-[var(--color-muted)]">{getRelativeTime(task.createdAt)}</span>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                {#if col.id !== 'done'}
                  <button
                    class="p-1 rounded text-[var(--color-muted)] hover:text-[var(--color-accent-green)]"
                    onclick={() => moveTask(task.id, col.id === 'todo' ? 'inProgress' : 'done')}
                    aria-label="Mover tarea"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                {/if}
                <button
                  class="p-1 rounded text-[var(--color-muted)] hover:text-[var(--color-accent-red)]"
                  onclick={() => deleteTask(task.id)}
                  aria-label="Eliminar tarea"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        {:else}
          <div class="flex flex-col items-center justify-center py-10 text-[var(--color-muted)] opacity-40">
            <p class="text-sm">{col.emptyText}</p>
          </div>
        {/each}
      </div>
    {/each}
  </div>

  <!-- Desktop: 3-column kanban -->
  <div class="hidden md:grid flex-1 grid-cols-3 gap-3 min-h-0 overflow-hidden">
    {#each COLUMNS as col}
      <div
        class="flex flex-col rounded-xl border transition-all duration-200 min-h-[160px]"
        class:border-[var(--color-primary)]={dragOverColumn === col.id}
        class:border-[var(--color-border)]={dragOverColumn !== col.id}
        ondragover={(e) => onDragOver(e, col.id)}
        ondragleave={onDragLeave}
        ondrop={(e) => onDrop(e, col.id)}
        role="region"
        aria-label={col.label}
      >
        <div class="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)]">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">{col.label}</h3>
          <span class="ml-auto text-[10px] text-[var(--color-muted)] bg-[var(--color-background)] px-1.5 py-0.5 rounded-full">
            {columnTasks(col.id).length}
          </span>
        </div>

        <div class="flex-1 p-2 space-y-2 overflow-y-auto">
          {#each columnTasks(col.id) as task (task.id)}
            <div
              class="card cursor-grab active:cursor-grabbing transition-opacity group"
              class:opacity-40={draggedTaskId === task.id}
              draggable="true"
              role="listitem"
              ondragstart={(e) => onDragStart(e, task.id)}
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <h4 class="text-sm font-medium truncate">{task.title}</h4>
                  {#if task.description}
                    <p class="text-xs text-[var(--color-muted)] mt-1 line-clamp-2">{task.description}</p>
                  {/if}
                </div>
                <button
                  class="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:text-[var(--color-accent-red)] text-[var(--color-muted)] shrink-0"
                  onclick={() => deleteTask(task.id)}
                  aria-label="Eliminar tarea"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <span class="text-[10px] text-[var(--color-muted)]">{getRelativeTime(task.createdAt)}</span>
            </div>
          {:else}
            <div class="flex flex-col items-center justify-center py-8 text-[var(--color-muted)] opacity-40 pointer-events-none">
              <p class="text-xs">{col.emptyText}</p>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>
