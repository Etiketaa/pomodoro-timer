<script lang="ts">
  import { tasksStore } from '../lib/stores/singleton';
  import { agentInsights } from '../lib/agent';
  import type { WeeklyInsights } from '../lib/agent';
  import type { ShutdownEntry } from '../lib/stores/singleton';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  let loading = $state(false);
  let error = $state('');
  let insights = $state<WeeklyInsights | null>(null);

  const last7Days = $derived.by(() => {
    const out: ShutdownEntry[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const entry = tasksStore.getShutdownEntry(key);
      if (entry) out.push(entry);
    }
    return out;
  });

  const completedPerDay = $derived.by(() => {
    const map = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = tasksStore.tasks.filter(
        (t) => t.status === 'done' && t.completedAt?.startsWith(key) && !t.parentId,
      ).length;
      if (count > 0) map.set(key, count);
    }
    return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
  });

  async function generate() {
    loading = true;
    error = '';
    try {
      insights = await agentInsights({
        tasks: tasksStore.tasks,
        shutdownEntries: last7Days,
        completedCounts: completedPerDay,
        streak: tasksStore.streak.currentStreak,
      });
    } catch (e) {
      error = e instanceof Error ? e.message : 'No se pudieron generar los insights';
    } finally {
      loading = false;
    }
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
  aria-label="Insights semanales"
>
  <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

  <div class="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card animate-scaleIn">
    <div class="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-border bg-card px-6 py-4">
      <h2 class="text-lg font-semibold">Insights semanales 🔎</h2>
      <button class="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground" onclick={onClose} aria-label="Cerrar">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <div class="px-6 py-4 space-y-4">
      <p class="text-sm text-muted-foreground">
        El asistente analiza tu semana: tareas completadas, rituales de cierre y racha. Detecta patrones y tareas que se atascaron.
      </p>

      {#if error}
        <p class="text-sm text-destructive text-balance">{error}</p>
      {/if}

      {#if !insights}
        <button
          class="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50"
          onclick={generate}
          disabled={loading}
        >
          {loading ? 'Analizando la semana…' : 'Generar insights'}
        </button>
      {/if}

      {#if insights}
        <div class="space-y-4 animate-scaleIn">
          <div class="rounded-xl border border-border bg-card/60 p-4">
            <p class="text-sm text-foreground/90">{insights.summary}</p>
          </div>

          {#if insights.insights.length === 0 && insights.stuckTasks.length === 0}
            <div class="rounded-xl border border-dashed border-border p-4 text-center">
              <p class="text-sm text-muted-foreground">No hay suficiente data semanal todavía. Completá tu ritual de cierre y tareas para ver patrones.</p>
            </div>
          {/if}

          {#if insights.insights.length > 0}
            <div>
              <h3 class="text-sm font-semibold mb-2">Patrones detectados</h3>
              <ul class="space-y-2">
                {#each insights.insights as insight}
                  <li class="flex items-start gap-2 text-sm text-foreground/85">
                    <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"></span>
                    <span>{insight}</span>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          {#if insights.stuckTasks.length > 0}
            <div>
              <h3 class="text-sm font-semibold mb-2 text-destructive">Tareas atascadas ⚠️</h3>
              <div class="space-y-2">
                {#each insights.stuckTasks as stuck}
                  <div class="rounded-lg border border-border bg-card/60 p-3">
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-sm font-medium truncate">{stuck.title}</p>
                      <span class="shrink-0 text-[10px] text-destructive font-medium">{stuck.daysInDoing}d en proceso</span>
                    </div>
                    <p class="text-xs text-muted-foreground mt-1">{stuck.suggestion}</p>
                    <div class="mt-2 flex gap-2">
                      {#if stuck.taskId}
                        <button
                          class="text-xs text-primary hover:underline"
                          onclick={() => tasksStore.updateTask(stuck.taskId!, { status: 'todo' })}
                        >
                          Volver a "Por hacer"
                        </button>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <div class="flex gap-2">
            <button
              class="flex-1 h-10 rounded-xl border border-border text-sm transition-colors hover:bg-card/60"
              onclick={() => { insights = null; }}
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
        </div>
      {/if}
    </div>
  </div>
</div>