<script lang="ts">
  import { tasksStore, type Task, type Energy } from '../lib/stores/singleton';
  import DailyNote from './DailyNote.svelte';
  import ShutdownRitual from './ShutdownRitual.svelte';
  import StreakBadge from './StreakBadge.svelte';
  import SplitTaskModal from './SplitTaskModal.svelte';
  import DailyPlan from './DailyPlan.svelte';
  import WeeklyInsights from './WeeklyInsights.svelte';

  const store = tasksStore;

  const COLUMNS: { id: Task['status']; label: string }[] = [
    { id: 'todo', label: 'Por hacer' },
    { id: 'doing', label: 'En proceso' },
    { id: 'done', label: 'Hecho' },
  ];

  let draft = $state('');
  let draftEnergy = $state<Energy>('medium');
  let showSplitModal = $state<string | null>(null);
  let showShutdown = $state(false);
  let showPlan = $state(false);
  let showInsights = $state(false);
  let mobileTab = $state<Task['status']>('todo');

  function addTask() {
    const title = draft.trim();
    if (!title) return;
    store.addTask(title, draftEnergy);
    draft = '';
    draftEnergy = 'medium';
  }

  function move(id: string, dir: 1 | -1) {
    store.moveTask(id, dir);
  }

  function remove(id: string) {
    store.removeTask(id);
  }

  function openSplit(id: string) {
    showSplitModal = id;
  }

  function closeSplit() {
    showSplitModal = null;
  }

  function handleSplit(parts: string[]) {
    if (showSplitModal) {
      store.splitTask(showSplitModal, parts);
      closeSplit();
    }
  }

  const energyLabels: Record<Energy, string> = {
    high: '🔥 Alta',
    medium: '⚡ Media',
    low: '🌱 Baja',
  };

  const energyColors: Record<Energy, string> = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  };
</script>

<section aria-label="Tablero de tareas" class="flex w-full flex-col gap-4">
  <!-- Streak Badge -->
  <StreakBadge streak={store.streak} completedToday={store.completedTodayCount} />

  <!-- Daily Note (Brain Dump) -->
  <DailyNote note={store.todayNote} onUpdate={store.updateDailyNote} />

  <!-- Energy Filter -->
  <div class="flex items-center gap-2 flex-wrap" role="group" aria-label="Filtrar por energía">
    <span class="text-xs text-muted-foreground">Energía:</span>
    {#each ['all', 'high', 'medium', 'low'] as filter}
      <button
        class="rounded-full px-3 py-1 text-xs font-medium transition-colors
               {store.energyFilter === filter
                 ? 'bg-primary text-primary-foreground'
                 : 'bg-card/60 text-muted-foreground hover:text-foreground'}"
        onclick={() => store.setEnergyFilter(filter as Energy | 'all')}
        aria-pressed={store.energyFilter === filter}
      >
        {filter === 'all' ? 'Todas' : energyLabels[filter as Energy]}
      </button>
    {/each}
  </div>

  <!-- Add task with energy selector -->
  <div class="flex items-center gap-2">
    <input
      class="h-11 flex-1 rounded-xl border border-border bg-card/60 px-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      type="text"
      placeholder="Añadí una tarea y presioná Enter"
      aria-label="Nueva tarea"
      bind:value={draft}
      onkeydown={(e) => { if (e.key === 'Enter') addTask(); }}
    />
    <select
      class="h-11 rounded-xl border border-border bg-card/60 px-3 text-sm outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      bind:value={draftEnergy}
      aria-label="Nivel de energía"
    >
      <option value="high">🔥 Alta</option>
      <option value="medium">⚡ Media</option>
      <option value="low">🌱 Baja</option>
    </select>
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
        aria-selected={mobileTab === col.id}
        class="flex-1 rounded-full px-2 py-2 text-xs font-medium transition-colors
               {mobileTab === col.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}"
        onclick={() => mobileTab = col.id}
      >
        {col.label}
        <span class="ml-1 opacity-70">{store.grouped[col.id].length}</span>
      </button>
    {/each}
  </div>

  <!-- Columns -->
  <div class="grid gap-4 md:grid-cols-3">
    {#each COLUMNS as col}
      <div
        class="flex flex-col gap-3 rounded-2xl border border-border bg-card/40 p-3
               {mobileTab !== col.id ? 'hidden md:flex' : 'flex'}"
      >
        <!-- Column header -->
        <div class="flex items-center justify-between px-1">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {col.label}
          </h3>
          <span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {store.grouped[col.id].length}
          </span>
        </div>

        {#if store.grouped[col.id].length === 0}
          <div class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/>
            </svg>
            <p class="text-xs text-muted-foreground">
              {col.id === 'todo' ? 'Sin tareas aún — añadí una arriba' : 'Nada por acá todavía'}
            </p>
          </div>
        {:else}
          {#each store.grouped[col.id] as task (task.id)}
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
                <div class="flex items-start gap-2">
                  <p class="text-sm leading-relaxed
                            {task.status === 'done' ? 'text-muted-foreground line-through' : ''}
                            flex-1">
                    {task.title}
                  </p>
                  {#if task.energy}
                    <span class="shrink-0 inline-flex items-center gap-1 mt-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      <span class="h-1.5 w-1.5 rounded-full {energyColors[task.energy]}"></span>
                      {energyLabels[task.energy]}
                    </span>
                  {/if}
                </div>
                {#if task.date}
                  <span class="inline-flex items-center gap-1 mt-1 rounded-full bg-accent/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {new Date(task.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  </span>
                {/if}

                {#if task.subtasks && task.subtasks.length > 0}
                  <div class="mt-2 flex flex-col gap-1">
                    {#each task.subtasks as st}
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          class="h-4 w-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary"
                          checked={st.done}
                          onchange={() => store.toggleSubtask(task.id, st.id)}
                        />
                        <span class="text-xs {st.done ? 'text-muted-foreground line-through' : 'text-foreground'}">
                          {st.title}
                        </span>
                      </label>
                    {/each}
                  </div>
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
                {#if task.status !== 'done' && (!task.subtasks || task.subtasks.length === 0)}
                  <button
                    class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    onclick={() => openSplit(task.id)}
                    aria-label="Dividir tarea en micro-tareas"
                    title="Dividir en partes de ~10 min"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="4" y1="12" x2="20" y2="12"/><line x1="12" y1="4" x2="12" y2="20"/>
                    </svg>
                  </button>
                {/if}
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

  <!-- Agentic actions -->
  <div class="mx-auto mt-4 flex w-full max-w-xl flex-wrap items-center justify-center gap-2">
    <button
      class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-w-[150px]"
      onclick={() => showPlan = true}
      title="Plan del día con IA"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
      Plan del día
    </button>
    <button
      class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-w-[150px]"
      onclick={() => showInsights = true}
      title="Insights semanales con IA"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
      Insights semanales
    </button>
  </div>

  <!-- Shutdown Ritual Button -->
  <button
    class="mx-auto mt-2 flex items-center gap-2 rounded-xl border border-border bg-card/60 px-4 py-3 text-sm transition-colors hover:bg-card/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    onclick={() => showShutdown = true}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><path d="M8 21h8"/><path d="M12 17v4"/>
    </svg>
    <span>Cerrar el día (Shutdown Ritual)</span>
    <span class="text-xs text-muted-foreground">({store.completedTodayCount} completadas hoy)</span>
  </button>

  {#if showSplitModal}
    <SplitTaskModal taskId={showSplitModal} onClose={closeSplit} onSplit={handleSplit} />
  {/if}

  {#if showShutdown}
    <ShutdownRitual onClose={() => showShutdown = false} completedToday={store.completedTodayCount} />
  {/if}

  {#if showPlan}
    <DailyPlan onClose={() => showPlan = false} />
  {/if}

  {#if showInsights}
    <WeeklyInsights onClose={() => showInsights = false} />
  {/if}
</section>