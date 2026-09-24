<script lang="ts">
  import { tasksStore } from '../lib/stores/singleton';
  import { agentPlan } from '../lib/agent';
  import type { DailyPlan, PlanFocus } from '../lib/agent';
  import type { Energy } from '../lib/stores/singleton';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  let loading = $state(false);
  let error = $state('');
  let plan = $state<DailyPlan | null>(null);
  let energyToday = $state<Energy>('medium');
  let generated = $state(false);

  const pending = $derived(
    tasksStore.tasks.filter((t) => t.status !== 'done' && !t.parentId),
  );

  function yesterdayFocus(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const key = d.toISOString().slice(0, 10);
    const entry = tasksStore.getShutdownEntry(key);
    return entry?.tomorrowFocus ?? '';
  }

  async function generate() {
    if (pending.length === 0) {
      error = 'No tenés tareas pendientes. Agregá algunas primero.';
      return;
    }
    loading = true;
    error = '';
    try {
      plan = await agentPlan({
        tasks: pending,
        energyToday,
        streak: tasksStore.streak.currentStreak,
        note: tasksStore.todayNote.content,
        yesterdayFocus: yesterdayFocus(),
      });
      generated = true;
    } catch (e) {
      error = e instanceof Error ? e.message : 'No se pudo generar el plan';
    } finally {
      loading = false;
    }
  }

  function startFocus(f: PlanFocus) {
    if (f.taskId) {
      tasksStore.updateTask(f.taskId, { status: 'doing' });
    } else {
      // Foco nuevo: crear la tarea y arrancarla
      const id = tasksStore.addTask(f.title, 'medium');
      tasksStore.updateTask(id, { status: 'doing' });
    }
  }

  function createTask(f: PlanFocus) {
    if (!f.taskId) {
      tasksStore.addTask(f.title, 'medium');
    }
  }

  function hasFocusInTasks(f: PlanFocus): boolean {
    return pending.some((t) => t.id === f.taskId || t.title === f.title);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4"
  onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
  role="dialog"
  tabindex="-1"
  aria-modal="true"
  aria-label="Plan del día"
>
  <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

  <div class="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card animate-scaleIn">
    <div class="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-border bg-card px-6 py-4">
      <h2 class="text-lg font-semibold">Plan del día ✨</h2>
      <button class="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground" onclick={onClose} aria-label="Cerrar">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <div class="px-6 py-4 space-y-4">
      <p class="text-sm text-muted-foreground">
        El asistente analiza tus tareas pendientes, tu nota del día y tu energía para proponerte los 3 focos de hoy.
      </p>

      <div>
        <label class="text-sm font-medium mb-2 block">¿Cómo te levantaste? (energía hoy)</label>
        <div class="flex gap-2" role="radiogroup" aria-label="Energía de hoy">
          {#each ['high', 'medium', 'low'] as e}
            <button
              class="flex-1 rounded-xl border-2 px-3 py-2 text-sm transition-colors
                     {energyToday === e ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-primary/30'}"
              onclick={() => energyToday = e as Energy}
              aria-pressed={energyToday === e}
            >
              {e === 'high' ? '🔥 Alta' : e === 'medium' ? '⚡ Media' : '🌱 Baja'}
            </button>
          {/each}
        </div>
      </div>

      {#if error}
        <p class="text-sm text-destructive text-balance">{error}</p>
      {/if}

      {#if !plan}
        <button
          class="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50"
          onclick={generate}
          disabled={loading || pending.length === 0}
        >
          {loading ? 'Pensando…' : pending.length === 0 ? 'Sin tareas pendientes' : `Generar plan (${pending.length} tareas)`}
        </button>
      {/if}

      {#if plan}
        <div class="rounded-xl border border-border bg-card/60 p-4 space-y-3 animate-scaleIn">
          <p class="text-sm text-foreground/90">{plan.message}</p>
          <ol class="space-y-2">
            {#each plan.focus as f, i}
              <li class="flex items-start gap-3 rounded-lg bg-card/60 border border-border p-3">
                <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">{i + 1}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium">{f.title}</p>
                  <p class="text-xs text-muted-foreground mt-0.5">{f.reason}</p>
                </div>
                <div class="flex shrink-0 gap-1">
                  <button
                    class="rounded-lg bg-primary px-2.5 py-1.5 text-xs text-primary-foreground transition-colors hover:opacity-90"
                    onclick={() => startFocus(f)}
                    title={f.taskId ? 'Mover a En proceso' : 'Crear tarea y empezar'}
                  >
                    Empezar
                  </button>
                  {#if !hasFocusInTasks(f)}
                    <button
                      class="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      onclick={() => createTask(f)}
                      title="Guardar como tarea"
                    >
                      +
                    </button>
                  {/if}
                </div>
              </li>
            {/each}
          </ol>
        </div>

        {#if generated}
          <div class="flex gap-2">
            <button
              class="flex-1 h-10 rounded-xl border border-border text-sm transition-colors hover:bg-card/60"
              onclick={() => { plan = null; generated = false; }}
            >
              Regenerar
            </button>
            <button
              class="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm transition-colors hover:opacity-90"
              onclick={onClose}
            >
              Listo
            </button>
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div>