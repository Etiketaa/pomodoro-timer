<script lang="ts">
  import { createTimerStore } from '../lib/stores/timer.svelte';

  const timer = createTimerStore();

  type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

  const MODES: Record<TimerMode, { label: string; minutes: number }> = {
    focus: { label: 'Enfoque', minutes: 25 },
    shortBreak: { label: 'Descanso corto', minutes: 5 },
    longBreak: { label: 'Descanso largo', minutes: 15 },
  };

  let currentMode = $state<TimerMode>('focus');
  let timeLeft = $state(25 * 60);
  let isRunning = $state(false);
  let sessions = $state(0);
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const totalSeconds = $derived(MODES[currentMode].minutes * 60);
  const progress = $derived(1 - timeLeft / totalSeconds);
  const minutes = $derived(Math.floor(timeLeft / 60));
  const seconds = $derived(timeLeft % 60);
  const display = $derived(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
  const circumference = $derived(2 * Math.PI * 140);
  const strokeDashoffset = $derived(circumference * (1 - progress));

  // Sync document.title
  $effect(() => {
    document.title = `${display} — Pomodoro`;
    return () => { document.title = 'Pomodoro Timer'; };
  });

  // Keyboard shortcut: spacebar to toggle
  $effect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        toggleTimer();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  function playAlarm() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 800;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.5);
    } catch {}
  }

  function startTimer() {
    if (isRunning) return;
    isRunning = true;
    intervalId = setInterval(() => {
      if (timeLeft <= 0) {
        clearInterval(intervalId!);
        isRunning = false;
        playAlarm();
        onTimerEnd();
        return;
      }
      timeLeft--;
    }, 1000);
  }

  function pauseTimer() {
    if (!isRunning) return;
    clearInterval(intervalId!);
    isRunning = false;
  }

  function resetTimer() {
    clearInterval(intervalId!);
    isRunning = false;
    timeLeft = totalSeconds;
  }

  function onTimerEnd() {
    if (currentMode === 'focus') {
      sessions++;
      timer.saveSession();
      if (sessions % 4 === 0) {
        switchMode('longBreak');
      } else {
        switchMode('shortBreak');
      }
    } else {
      switchMode('focus');
    }
  }

  function switchMode(mode: TimerMode) {
    clearInterval(intervalId!);
    isRunning = false;
    currentMode = mode;
    timeLeft = MODES[mode].minutes * 60;
  }

  function toggleTimer() {
    if (isRunning) pauseTimer();
    else startTimer();
  }

  function skipSession() {
    clearInterval(intervalId!);
    isRunning = false;
    onTimerEnd();
  }
</script>

<div class="flex flex-col items-center gap-6">
  <!-- Tabs -->
  <div class="flex gap-1 p-1 rounded-xl bg-[var(--color-card)]" role="tablist">
    {#each (['focus', 'shortBreak', 'longBreak'] as const) as mode}
      <button
        role="tab"
        aria-selected={mode === currentMode}
        class="tab"
        onclick={() => switchMode(mode)}
      >
        {MODES[mode].label}
      </button>
    {/each}
  </div>

  <!-- Ring -->
  <div class="relative">
    <svg width="320" height="320" viewBox="0 0 320 320" class="transform -rotate-90">
      <circle
        cx="160" cy="160" r="140"
        fill="none"
        stroke="var(--color-border)"
        stroke-width="10"
      />
      <circle
        cx="160" cy="160" r="140"
        fill="none"
        stroke="var(--color-primary)"
        stroke-width="10"
        stroke-linecap="round"
        stroke-dasharray={circumference}
        stroke-dashoffset={strokeDashoffset}
        class="transition-[stroke-dashoffset] duration-1000 ease-linear"
        style={isRunning ? 'filter: drop-shadow(0 0 12px var(--color-primary));' : ''}
      />
    </svg>

    <!-- Center display -->
    <div class="absolute inset-0 flex flex-col items-center justify-center gap-1">
      <span
        class="text-[4.5rem] leading-none font-mono font-bold tracking-tight tabular-nums"
        style={isRunning ? 'text-shadow: 0 0 24px rgba(232,122,58,0.3);' : ''}
      >
        {display}
      </span>
      <span class="text-sm text-[var(--color-muted)]">
        {sessions > 0 ? `Sesión #${sessions}` : 'Listo'}
      </span>
    </div>
  </div>

  <!-- Controls -->
  <div class="flex items-center gap-3">
    <button
      class="btn btn-ghost p-3 rounded-full"
      onclick={resetTimer}
      aria-label="Reiniciar"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
      </svg>
    </button>

    <button
      class="w-16 h-16 rounded-full flex items-center justify-center bg-[var(--color-primary)] text-[var(--color-background)] font-bold transition-all duration-200 hover:brightness-110 active:scale-95"
      onclick={toggleTimer}
      aria-label={isRunning ? 'Pausar' : 'Iniciar'}
    >
      {#if isRunning}
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"/>
          <rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" class="ml-1">
          <polygon points="6,3 20,12 6,21"/>
        </svg>
      {/if}
    </button>

    <button
      class="btn btn-ghost p-3 rounded-full"
      onclick={skipSession}
      aria-label="Saltar"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5 4 15 12 5 20 5 4"/>
        <line x1="19" y1="5" x2="19" y2="19"/>
      </svg>
    </button>
  </div>
</div>
