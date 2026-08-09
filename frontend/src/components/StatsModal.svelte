<script lang="ts">
  let { onclose = () => {} }: { onclose: () => void } = $props();

  type Stats = { totalSessions: number; totalMinutes: number; streak: number; lastDate: string };

  let stats = $state<Stats>({ totalSessions: 0, totalMinutes: 0, streak: 0, lastDate: '' });

  $effect(() => {
    const raw = localStorage.getItem('pomodoroStats');
    if (raw) stats = JSON.parse(raw);
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }

  const hoursFocused = $derived(Math.floor(stats.totalMinutes / 60));
  const todayStr = $derived(new Date().toDateString());
  const isActiveToday = $derived(stats.lastDate === todayStr);
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4"
  onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
  role="dialog"
  tabindex="-1"
  aria-modal="true"
  aria-label="Statistics"
>
  <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

  <div class="relative rounded-2xl border border-border bg-card w-full max-w-md max-h-[85vh] overflow-y-auto animate-scaleIn">
    <div class="sticky top-0 rounded-t-2xl px-6 py-4 flex items-center justify-between z-10 border-b border-border bg-card">
      <h2 class="text-lg font-semibold">Statistics</h2>
      <button class="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground" onclick={onclose} aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <div class="px-6 py-4 space-y-6">
      <!-- Streak -->
      <div class="text-center">
        <div class="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-6 py-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="var(--primary)" stroke="none">
            <polygon points="12,2 15,8 22,9 17,14 18,21 12,17 6,21 7,14 2,9 9,8"/>
          </svg>
          <div>
            <span class="text-2xl font-bold text-primary">{stats.streak}</span>
            <span class="text-sm text-muted-foreground ml-1">day streak</span>
          </div>
        </div>
        {#if isActiveToday}
          <p class="text-xs text-primary mt-2">Active today!</p>
        {:else}
          <p class="text-xs text-muted-foreground mt-2">Start a session to keep your streak</p>
        {/if}
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 gap-3">
        {#each [
          { value: stats.totalSessions, label: 'Total Sessions', color: 'text-primary' },
          { value: hoursFocused, label: 'Hours Focused', color: 'text-primary' },
          { value: stats.totalMinutes, label: 'Total Minutes', color: 'text-foreground' },
          { value: stats.totalSessions > 0 ? Math.round(stats.totalMinutes / stats.totalSessions) : '--', label: 'Avg Min/Session', color: 'text-foreground' },
        ] as stat}
          <div class="rounded-xl border border-border bg-card/60 p-4 text-center">
            <span class="text-3xl font-bold tabular-nums {stat.color}">{stat.value}</span>
            <p class="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        {/each}
      </div>

      <!-- Quick Insight -->
      <div class="rounded-xl border border-border bg-card/60 p-4">
        <p class="text-sm font-medium">Productivity Trend</p>
        <p class="text-xs text-muted-foreground mt-1">
          {#if stats.totalSessions === 0}
            Start your first Pomodoro session to see your stats grow.
          {:else if stats.totalSessions < 10}
            You're getting started! Keep building the habit.
          {:else if stats.streak >= 7}
            Amazing consistency! {stats.streak} consecutive days.
          {:else}
            {stats.totalSessions} sessions completed. Great progress!
          {/if}
        </p>
      </div>
    </div>

    <div class="sticky bottom-0 rounded-b-2xl px-6 py-4 border-t border-border bg-card">
      <button class="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90" onclick={onclose}>OK</button>
    </div>
  </div>
</div>
