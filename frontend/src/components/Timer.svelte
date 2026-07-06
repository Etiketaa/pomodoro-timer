<script lang="ts">
  import { createTimerStore } from '../lib/stores/timer.svelte';

  const timer = createTimerStore();

  const MODES: Record<TimerMode, { label: string; minutes: number; color: string }> = {
    focus: { label: 'Focus', minutes: 25, color: 'var(--primary)' },
    shortBreak: { label: 'Short Break', minutes: 5, color: 'var(--accent-green)' },
    longBreak: { label: 'Long Break', minutes: 15, color: 'var(--accent-blue)' },
  };

  type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

  let currentMode = $state<TimerMode>('focus');
  let timeLeft = $state(25 * 60);
  let isRunning = $state(false);
  let sessions = $state(0);
  let intervalId: ReturnType<typeof setInterval> | null = $state(null);

  const totalSeconds = $derived(MODES[currentMode].minutes * 60);
  const progress = $derived(1 - timeLeft / totalSeconds);
  const minutes = $derived(Math.floor(timeLeft / 60));
  const seconds = $derived(timeLeft % 60);
  const display = $derived(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
  const circumference = $derived(2 * Math.PI * 180);
  const strokeDashoffset = $derived(circumference * (1 - progress));

  function startTimer() {
    if (isRunning) return;
    isRunning = true;
    intervalId = setInterval(() => {
      if (timeLeft <= 0) {
        clearInterval(intervalId!);
        isRunning = false;
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
    timeLeft = MODES[currentMode].minutes * 60;
  }

  function onTimerEnd() {
    const audio = new Audio('/sounds/bell.mp3');
    audio.play().catch(() => {});
    timeLeft = MODES[currentMode].minutes * 60;
    if (currentMode === 'focus') {
      sessions++;
      if (sessions % 4 === 0) {
        currentMode = 'longBreak';
      } else {
        currentMode = 'shortBreak';
      }
    } else {
      currentMode = 'focus';
    }
  }

  function switchMode(mode: TimerMode) {
    clearInterval(intervalId!);
    isRunning = false;
    currentMode = mode;
    timeLeft = MODES[mode].minutes * 60;
  }

  function toggleTimer() {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }
</script>

<div class="flex flex-col items-center justify-center gap-8">
  <!-- Mode Selector -->
  <div class="flex gap-1 glass rounded-full p-1">
    {#each ['focus', 'shortBreak', 'longBreak'] as mode}
      <button
        class="px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300"
        class:bg-primary={mode === currentMode && mode === 'focus'}
        class:bg-accent-green={mode === currentMode && mode === 'shortBreak'}
        class:bg-accent-blue={mode === currentMode && mode === 'longBreak'}
        class:text-white={mode === currentMode}
        class:text-text-muted={mode !== currentMode}
        onclick={() => switchMode(mode as TimerMode)}
      >
        {MODES[mode as TimerMode].label}
      </button>
    {/each}
  </div>

  <!-- Timer Circle -->
  <div class="relative">
    <svg width="400" height="400" viewBox="0 0 400 400" class="transform -rotate-90 drop-shadow-glow">
      <!-- Background circle -->
      <circle
        cx="200" cy="200" r="180"
        fill="none"
        stroke="var(--border)"
        stroke-width="6"
        opacity="0.3"
      />
      <!-- Progress circle -->
      <circle
        cx="200" cy="200" r="180"
        fill="none"
        stroke={MODES[currentMode].color}
        stroke-width="6"
        stroke-linecap="round"
        stroke-dasharray={circumference}
        stroke-dashoffset={strokeDashoffset}
        class="transition-[stroke-dashoffset] duration-1000 ease-linear"
        style="filter: drop-shadow(0 0 8px {MODES[currentMode].color});"
      />
    </svg>

    <!-- Timer Display -->
    <div class="absolute inset-0 flex flex-col items-center justify-center gap-2">
      <span
        class="text-7xl font-extrabold tracking-tight tabular-nums"
        style="color: {MODES[currentMode].color}; text-shadow: 0 0 30px {MODES[currentMode].color}40;"
      >
        {display}
      </span>
      <span class="text-text-muted text-sm uppercase tracking-wider">
        {sessions > 0 ? `Session #${sessions}` : 'Get ready'}
      </span>
    </div>
  </div>

  <!-- Controls -->
  <div class="flex items-center gap-4">
    <button
      class="btn btn-ghost p-3 rounded-full text-text-muted hover:text-text transition-colors"
      onclick={resetTimer}
      title="Reset"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
      </svg>
    </button>

    <button
      class="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
      style="background: {MODES[currentMode].color}; box-shadow: 0 0 24px {MODES[currentMode].color}60;"
      onclick={toggleTimer}
    >
      {#if isRunning}
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white">
          <rect x="6" y="4" width="4" height="16" rx="1"/>
          <rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white" class="ml-1">
          <polygon points="6,3 20,12 6,21"/>
        </svg>
      {/if}
    </button>

    <button
      class="btn btn-ghost p-3 rounded-full text-text-muted hover:text-text transition-colors"
      onclick={() => {
        clearInterval(intervalId!);
        isRunning = false;
        timeLeft = totalSeconds;
        currentMode = 'focus';
      }}
      title="Skip"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5 4 15 12 5 20 5 4"/>
        <line x1="19" y1="5" x2="19" y2="19"/>
      </svg>
    </button>
  </div>

  <!-- Sessions Counter -->
  <div class="flex items-center gap-2 glass rounded-full px-5 py-2.5">
    <span class="text-text-muted text-sm">Sessions today:</span>
    <span class="font-bold text-primary"> {sessions} </span>
  </div>
</div>

<style>
  .drop-shadow-glow {
    filter: drop-shadow(0 0 20px var(--primary));
  }
</style>