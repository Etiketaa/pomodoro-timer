<script lang="ts">
  let { onclose = () => {} }: { onclose: () => void } = $props();

  let focusMinutes = $state(25);
  let shortBreakMinutes = $state(5);
  let longBreakMinutes = $state(15);
  let longBreakInterval = $state(4);
  let autoStartBreaks = $state(false);
  let autoStartFocus = $state(true);
  let theme = $state<'dark' | 'light'>('dark');
  let volume = $state(80);
  let notifications = $state(true);

  $effect(() => {
    // Load saved settings
    const saved = localStorage.getItem('pomodoroSettings');
    if (saved) {
      const s = JSON.parse(saved);
      focusMinutes = s.focusMinutes ?? 25;
      shortBreakMinutes = s.shortBreakMinutes ?? 5;
      longBreakMinutes = s.longBreakMinutes ?? 15;
      longBreakInterval = s.longBreakInterval ?? 4;
      autoStartBreaks = s.autoStartBreaks ?? false;
      autoStartFocus = s.autoStartFocus ?? true;
      theme = s.theme ?? 'dark';
      volume = s.volume ?? 80;
      notifications = s.notifications ?? true;
    }
  });

  function save() {
    const settings = {
      focusMinutes,
      shortBreakMinutes,
      longBreakMinutes,
      longBreakInterval,
      autoStartBreaks,
      autoStartFocus,
      theme,
      volume,
      notifications,
    };
    localStorage.setItem('pomodoroSettings', JSON.stringify(settings));

    // Apply theme immediately
    document.documentElement.classList.toggle('light', theme === 'light');

    onclose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
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
  aria-label="Settings"
>
  <!-- Backdrop -->
  <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

  <!-- Modal Content -->
  <div class="relative glass-strong rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto animate-scaleIn">
    <div class="sticky top-0 glass-strong rounded-t-2xl px-6 py-4 flex items-center justify-between z-10">
      <div class="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <h2 class="text-lg font-bold text-text">Settings</h2>
      </div>
      <button class="btn btn-ghost p-1.5 rounded-lg" onclick={onclose} aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <div class="px-6 py-4 space-y-6">
      <!-- Timer Durations -->
      <section>
        <h3 class="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Timer Duration</h3>
        <div class="grid grid-cols-3 gap-3">
          <div class="glass rounded-lg p-3 flex flex-col items-center gap-1">
            <label for="focus-input" class="text-xs text-text-muted">Focus</label>
            <input
              id="focus-input"
              class="w-16 text-center bg-transparent text-lg font-bold text-text focus:outline-none border-b border-border/50 focus:border-primary transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              type="number"
              min="5" max="120"
              bind:value={focusMinutes}
            />
          </div>
          <div class="glass rounded-lg p-3 flex flex-col items-center gap-1">
            <label for="short-break-input" class="text-xs text-text-muted">Short Break</label>
            <input
              id="short-break-input"
              class="w-16 text-center bg-transparent text-lg font-bold text-text focus:outline-none border-b border-border/50 focus:border-primary transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              type="number"
              min="1" max="30"
              bind:value={shortBreakMinutes}
            />
          </div>
          <div class="glass rounded-lg p-3 flex flex-col items-center gap-1">
            <label for="long-break-input" class="text-xs text-text-muted">Long Break</label>
            <input
              id="long-break-input"
              class="w-16 text-center bg-transparent text-lg font-bold text-text focus:outline-none border-b border-border/50 focus:border-primary transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              type="number"
              min="5" max="60"
              bind:value={longBreakMinutes}
            />
          </div>
        </div>
        <div class="glass rounded-lg p-3 mt-3 flex items-center justify-between">
          <label for="interval-input" class="text-sm text-text">Long Break Interval</label>
          <span class="text-xs text-text-muted">Every</span>
          <input
            id="interval-input"
            class="w-14 text-center bg-transparent text-sm font-semibold text-text focus:outline-none border-b border-border/50 focus:border-primary transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            type="number"
            min="2" max="10"
            bind:value={longBreakInterval}
          />
          <span class="text-xs text-text-muted">focus</span>
        </div>
      </section>

      <!-- Behavior -->
      <section>
        <h3 class="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Behavior</h3>
        <div class="space-y-2">
          <label class="glass rounded-lg p-3 flex items-center justify-between cursor-pointer">
            <span class="text-sm text-text">Auto-start Breaks</span>
            <input type="checkbox" class="sr-only" bind:checked={autoStartBreaks} />
            <div class="w-10 h-6 rounded-full transition-colors p-0.5" class:bg-primary={autoStartBreaks} class:bg-border={!autoStartBreaks}>
              <div class="w-5 h-5 rounded-full bg-white transition-transform" class:translate-x-4={autoStartBreaks}></div>
            </div>
          </label>
          <label class="glass rounded-lg p-3 flex items-center justify-between cursor-pointer">
            <span class="text-sm text-text">Auto-start Focus</span>
            <input type="checkbox" class="sr-only" bind:checked={autoStartFocus} />
            <div class="w-10 h-6 rounded-full transition-colors p-0.5" class:bg-primary={autoStartFocus} class:bg-border={!autoStartFocus}>
              <div class="w-5 h-5 rounded-full bg-white transition-transform" class:translate-x-4={autoStartFocus}></div>
            </div>
          </label>
        </div>
      </section>

      <!-- Appearance -->
      <section>
        <h3 class="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Appearance</h3>
        <div class="flex gap-2">
          <button
            class="flex-1 btn rounded-lg text-sm"
            class:btn-primary={theme === 'dark'}
            class:btn-secondary={theme !== 'dark'}
            onclick={() => theme = 'dark'}
          >Dark</button>
          <button
            class="flex-1 btn rounded-lg text-sm"
            class:btn-primary={theme === 'light'}
            class:btn-secondary={theme !== 'light'}
            onclick={() => theme = 'light'}
          >Light</button>
        </div>
      </section>

      <!-- Audio -->
      <section>
        <h3 class="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Audio</h3>
        <div class="glass rounded-lg p-3 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-text">Volume</span>
            <span class="text-xs text-text-muted tabular-nums">{volume}%</span>
          </div>
          <input
            type="range"
            min="0" max="100"
            bind:value={volume}
            class="w-full appearance-none h-1.5 rounded-full bg-border/50 accent-primary focus:outline-none"
          />
          <label class="flex items-center justify-between cursor-pointer">
            <span class="text-sm text-text">Notifications</span>
            <input type="checkbox" class="sr-only" bind:checked={notifications} />
            <div class="w-10 h-6 rounded-full transition-colors p-0.5" class:bg-primary={notifications} class:bg-border={!notifications}>
              <div class="w-5 h-5 rounded-full bg-white transition-transform" class:translate-x-4={notifications}></div>
            </div>
          </label>
        </div>
      </section>
    </div>

    <!-- Footer -->
    <div class="sticky bottom-0 glass-strong rounded-b-2xl px-6 py-4 flex gap-3">
      <button class="btn btn-secondary flex-1" onclick={onclose}>Cancel</button>
      <button class="btn btn-primary flex-1" onclick={save}>Save & Close</button>
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