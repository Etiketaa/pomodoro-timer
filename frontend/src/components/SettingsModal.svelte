<script lang="ts">
  let { onclose = () => {} }: { onclose: () => void } = $props();

  let focusMinutes = $state(25);
  let shortBreakMinutes = $state(5);
  let longBreakMinutes = $state(15);
  let longBreakInterval = $state(4);
  let autoStartBreaks = $state(false);
  let autoStartFocus = $state(true);
  let volume = $state(80);
  let notifications = $state(true);

  $effect(() => {
    const saved = localStorage.getItem('pomodoroSettings');
    if (saved) {
      const s = JSON.parse(saved);
      focusMinutes = s.focusMinutes ?? 25;
      shortBreakMinutes = s.shortBreakMinutes ?? 5;
      longBreakMinutes = s.longBreakMinutes ?? 15;
      longBreakInterval = s.longBreakInterval ?? 4;
      autoStartBreaks = s.autoStartBreaks ?? false;
      autoStartFocus = s.autoStartFocus ?? true;
      volume = s.volume ?? 80;
      notifications = s.notifications ?? true;
    }
  });

  function save() {
    const settings = {
      focusMinutes, shortBreakMinutes, longBreakMinutes,
      longBreakInterval, autoStartBreaks, autoStartFocus,
      volume, notifications,
    };
    localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
    onclose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4"
  onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
  role="dialog"
  tabindex="-1"
  aria-modal="true"
  aria-label="Settings"
>
  <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

  <div class="relative rounded-2xl border border-border bg-card w-full max-w-md max-h-[85vh] overflow-y-auto animate-scaleIn">
    <div class="sticky top-0 rounded-t-2xl px-6 py-4 flex items-center justify-between z-10 border-b border-border bg-card">
      <h2 class="text-lg font-semibold">Settings</h2>
      <button class="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground" onclick={onclose} aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <div class="px-6 py-4 space-y-6">
      <!-- Timer Durations -->
      <section>
        <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Timer Duration</h3>
        <div class="grid grid-cols-3 gap-3">
          {#each [
            { label: 'Focus', bind: focusMinutes, min: 5, max: 120 },
            { label: 'Short Break', bind: shortBreakMinutes, min: 1, max: 30 },
            { label: 'Long Break', bind: longBreakMinutes, min: 5, max: 60 },
          ] as item}
            <div class="rounded-xl border border-border bg-card/60 p-3 flex flex-col items-center gap-1">
              <label class="text-xs text-muted-foreground">{item.label}</label>
              <input
                class="w-16 text-center bg-transparent text-lg font-semibold outline-none border-b border-border focus:border-primary transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                type="number"
                min={item.min} max={item.max}
                bind:value={item.bind}
              />
            </div>
          {/each}
        </div>
        <div class="rounded-xl border border-border bg-card/60 p-3 mt-3 flex items-center justify-between">
          <label for="interval-input" class="text-sm">Long Break Interval</label>
          <div class="flex items-center gap-1">
            <span class="text-xs text-muted-foreground">Every</span>
            <input
              id="interval-input"
              class="w-10 text-center bg-transparent text-sm font-semibold outline-none border-b border-border focus:border-primary transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              type="number" min="2" max="10"
              bind:value={longBreakInterval}
            />
            <span class="text-xs text-muted-foreground">focus</span>
          </div>
        </div>
      </section>

      <!-- Behavior -->
      <section>
        <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Behavior</h3>
        <div class="space-y-2">
          {#each [
            { label: 'Auto-start Breaks', bind: autoStartBreaks },
            { label: 'Auto-start Focus', bind: autoStartFocus },
          ] as item}
            <label class="rounded-xl border border-border bg-card/60 p-3 flex items-center justify-between cursor-pointer">
              <span class="text-sm">{item.label}</span>
              <input type="checkbox" class="sr-only" bind:checked={item.bind} />
              <div class="w-10 h-6 rounded-full transition-colors p-0.5 {item.bind ? 'bg-primary' : 'bg-muted'}">
                <div class="w-5 h-5 rounded-full bg-white transition-transform {item.bind ? 'translate-x-4' : ''}"></div>
              </div>
            </label>
          {/each}
        </div>
      </section>

      <!-- Audio -->
      <section>
        <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Audio</h3>
        <div class="rounded-xl border border-border bg-card/60 p-3 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm">Volume</span>
            <span class="text-xs text-muted-foreground tabular-nums">{volume}%</span>
          </div>
          <input
            type="range" min="0" max="100"
            bind:value={volume}
            class="w-full appearance-none h-1.5 rounded-full bg-muted accent-primary focus:outline-none"
          />
          <label class="flex items-center justify-between cursor-pointer">
            <span class="text-sm">Notifications</span>
            <input type="checkbox" class="sr-only" bind:checked={notifications} />
            <div class="w-10 h-6 rounded-full transition-colors p-0.5 {notifications ? 'bg-primary' : 'bg-muted'}">
              <div class="w-5 h-5 rounded-full bg-white transition-transform {notifications ? 'translate-x-4' : ''}"></div>
            </div>
          </label>
        </div>
      </section>
    </div>

    <div class="sticky bottom-0 rounded-b-2xl px-6 py-4 flex gap-3 border-t border-border bg-card">
      <button class="flex-1 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-medium hover:opacity-90" onclick={onclose}>Cancel</button>
      <button class="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90" onclick={save}>Save</button>
    </div>
  </div>
</div>
