<script lang="ts">
  import type { StreakData } from '../lib/stores/tasks.svelte.ts';

  interface Props {
    streak: StreakData;
    completedToday: number;
  }

  let { streak, completedToday }: Props = $props();

  const todayStr = new Date().toISOString().slice(0, 10);
  const isActiveToday = streak.history.includes(todayStr);

  const streakEmoji = streak.currentStreak >= 7 ? '🔥' : 
                      streak.currentStreak >= 3 ? '⚡' : '🌱';
</script>

<div class="flex items-center gap-3 rounded-2xl border border-border bg-card/40 p-3" role="region" aria-label="Racha de productividad">
  <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
    <span class="text-xl">{streakEmoji}</span>
  </div>
  
  <div class="flex-1 min-w-0">
    <div class="flex items-center gap-2">
      <span class="text-lg font-bold tabular-nums">{streak.currentStreak}</span>
      <span class="text-xs text-muted-foreground uppercase tracking-wider">
        {streak.currentStreak === 1 ? 'día' : 'días'} seguidos
      </span>
      {#if streak.longestStreak > streak.currentStreak}
        <span class="text-[10px] text-muted-foreground/60">(mejor: {streak.longestStreak})</span>
      {/if}
    </div>
    <div class="mt-1 flex items-center gap-2">
      <div class="flex-1 h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={Math.min(streak.currentStreak, 21)} aria-valuemin={0} aria-valuemax={21} aria-label="Progreso hacia hábito de 21 días">
        <div class="h-full bg-primary transition-all duration-500" style="width: {Math.min(streak.currentStreak / 21 * 100, 100)}%"></div>
      </div>
      <span class="text-[10px] text-muted-foreground shrink-0">21 días → hábito</span>
    </div>
  </div>

  <div class="flex flex-col items-end gap-1 text-right">
    {#if isActiveToday}
      <span class="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-500">
        <span class="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
        Activo hoy 🔥
      </span>
    {:else if completedToday > 0}
      <span class="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">
        {completedToday} completada{completedToday !== 1 ? 's' : ''} — click en "Cerrar el día" para confirmar racha
      </span>
    {:else}
      <span class="text-[10px] text-muted-foreground/60">Completá una tarea para empezar la racha</span>
    {/if}
    
    {#if streak.lastActiveDate && streak.lastActiveDate !== todayStr}
      <span class="text-[10px] text-muted-foreground/50">
        Último día activo: {new Date(streak.lastActiveDate + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
      </span>
    {/if}
  </div>
</div>