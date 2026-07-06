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

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let weeklySessions = $state<number[]>([0, 0, 0, 0, 0, 0, 0]);
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4"
  onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
  role="dialog"
  tabindex="-1"
  aria-modal="true"
  aria-label="Statistics"
>
  <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

  <div class="relative glass-strong rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto animate-scaleIn">
    <div class="sticky top-0 glass-strong rounded-t-2xl px-6 py-4 flex items-center justify-between z-10">
      <div class="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
        <h2 class="text-lg font-bold text-text">Statistics</h2>
      </div>
      <button class="btn btn-ghost p-1.5 rounded-lg" onclick={onclose} aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <div class="px-6 py-4 space-y-6">
      <!-- Streak -->
      <div class="text-center">
        <div class="inline-flex items-center gap-2 glass rounded-full px-6 py-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="var(--primary)" stroke="none">
            <polygon points="12,2 15,8 22,9 17,14 18,21 12,17 6,21 7,14 2,9 9,8"/>
          </svg>
          <div>
            <span class="text-2xl font-bold text-primary">{stats.streak}</span>
            <span class="text-sm text-text-muted ml-1">day streak</span>
          </div>
        </div>
        {#if isActiveToday}
          <p class="text-xs text-accent-green mt-2">Active today!</p>
        {:else}
          <p class="text-xs text-text-muted mt-2">Start a session to keep your streak</p>
        {/if}
      </div>

      <!-- Main Stats Grid -->
      <div class="grid grid-cols-2 gap-3">
        <div class="glass rounded-xl p-4 text-center">
          <span class="text-3xl font-bold text-primary tabular-nums">{stats.totalSessions}</span>
          <p class="text-xs text-text-muted mt-1">Total Sessions</p>
        </div>
        <div class="glass rounded-xl p-4 text-center">
          <span class="text-3xl font-bold text-accent-blue tabular-nums">{hoursFocused}</span>
          <p class="text-xs text-text-muted mt-1">Hours Focused</p>
        </div>
        <div class="glass rounded-xl p-4 text-center">
          <span class="text-2xl font-bold text-accent-green tabular-nums">{stats.totalMinutes}</span>
          <p class="text-xs text-text-muted mt-1">Total Minutes</p>
        </div>
        <div class="glass rounded-xl p-4 text-center">
          <span class="text-2xl font-bold text-accent-purple tabular-nums">{stats.totalSessions > 0 ? Math.round(stats.totalMinutes / stats.totalSessions) : '--'}</span>
          <p class="text-xs text-text-muted mt-1">Avg Min/Session</p>
        </div>
      </div>

      <!-- Weekly Chart -->
      <section>
        <h3 class="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">This Week</h3>
        <div class="glass rounded-xl p-4">
          <div class="flex items-end justify-between gap-1 h-32">
            {#each WEEKDAYS as day, i}
              <div class="flex-1 flex flex-col items-center gap-1">
                <div
                  class="w-full rounded-t-sm transition-all duration-500 {weeklySessions[i] > 0 ? 'bg-primary' : 'bg-border/30'}"
                  style="height: {Math.max(4, Math.min(weeklySessions[i] * 20, 96))}px;"
                ></div>
                <span class="text-[10px] text-text-muted">{day}</span>
              </div>
            {/each}
          </div>
        </div>
      </section>

      <!-- Quick Insight -->
      <div class="glass rounded-xl p-4">
        <p class="text-sm text-text font-medium">Productivity Trend</p>
        <p class="text-xs text-text-muted mt-1">
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

    <div class="sticky bottom-0 glass-strong rounded-b-2xl px-6 py-4">
      <button class="btn btn-primary w-full" onclick={onclose}>OK</button>
    </div>
  </div>
</div>

<style>
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  .animate-scaleIn { animation: scaleIn 0.2s ease-out; }
</style>