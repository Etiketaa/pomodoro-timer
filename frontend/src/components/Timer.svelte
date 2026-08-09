<script lang="ts">
  import { createTimerStore } from '../lib/stores/timer.svelte';

  const timer = createTimerStore();

  type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

  const MODES: { id: TimerMode; label: string; minutes: number }[] = [
    { id: 'focus', label: 'Enfoque', minutes: 25 },
    { id: 'shortBreak', label: 'Descanso corto', minutes: 5 },
    { id: 'longBreak', label: 'Descanso largo', minutes: 15 },
  ];

  const CYCLES_BEFORE_LONG = 4;

  let currentMode = $state<TimerMode>('focus');
  let timeLeft = $state(25 * 60);
  let isRunning = $state(false);
  let sessions = $state(0);
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const totalSeconds = $derived(MODES.find(m => m.id === currentMode)!.minutes * 60);
  const progress = $derived(1 - timeLeft / totalSeconds);
  const minutes = $derived(Math.floor(timeLeft / 60));
  const seconds = $derived(timeLeft % 60);
  const display = $derived(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
  const R = 120;
  const circumference = $derived(2 * Math.PI * R);
  const strokeDashoffset = $derived(circumference * (1 - progress));

  // Sync document.title
  $effect(() => {
    const label = MODES.find(m => m.id === currentMode)?.label ?? '';
    document.title = isRunning ? `${display} · ${label}` : 'Lofi Pomodoro';
    return () => { document.title = 'Lofi Pomodoro'; };
  });

  // Spacebar toggle
  $effect(() => {
    function handleKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        toggleTimer();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  function playChime() {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const start = now + i * 0.16;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.25, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.95);
      });
      setTimeout(() => ctx.close(), 2000);
    } catch {}
  }

  function advanceMode() {
    if (currentMode === 'focus') {
      sessions++;
      timer.saveSession();
      const goLong = sessions % CYCLES_BEFORE_LONG === 0;
      switchMode(goLong ? 'longBreak' : 'shortBreak', true);
    } else {
      switchMode('focus', true);
    }
  }

  function startTimer() {
    if (isRunning) return;
    isRunning = true;
    intervalId = setInterval(() => {
      if (timeLeft <= 1) {
        clearInterval(intervalId!);
        isRunning = false;
        playChime();
        timeLeft = 0;
        advanceMode();
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

  function switchMode(mode: TimerMode, autostart = false) {
    clearInterval(intervalId!);
    currentMode = mode;
    timeLeft = MODES.find(m => m.id === mode)!.minutes * 60;
    isRunning = autostart;
    if (autostart) startTimer();
  }

  function toggleTimer() {
    if (isRunning) pauseTimer();
    else startTimer();
  }

  function nextMode() {
    const idx = MODES.findIndex(m => m.id === currentMode);
    switchMode(MODES[(idx + 1) % MODES.length].id);
  }

  const currentLabel = $derived(MODES.find(m => m.id === currentMode)?.label ?? '');
</script>

<section aria-label="Temporizador Pomodoro" class="flex w-full flex-col items-center gap-6">
  <!-- Mode tabs -->
  <div
    role="tablist"
    aria-label="Modo del temporizador"
    class="flex w-full max-w-sm items-center gap-1 rounded-full border border-border bg-card/60 p-1 backdrop-blur"
  >
    {#each MODES as m}
      <button
        role="tab"
        aria-selected={m.id === currentMode}
        class="flex-1 rounded-full px-3 py-2 text-xs font-medium transition-colors sm:text-sm
               focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring
               {m.id === currentMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}"
        onclick={() => switchMode(m.id)}
      >
        {m.label}
      </button>
    {/each}
  </div>

  <!-- Ring -->
  <div class="relative aspect-square w-full max-w-[300px]">
    <!-- soft glow behind ring when running -->
    <div
      aria-hidden="true"
      class="absolute inset-6 rounded-full bg-primary/10 blur-2xl transition-opacity duration-700"
      class:opacity-100={isRunning}
      class:opacity-0={!isRunning}
    ></div>

    <svg viewBox="0 0 280 280" class="h-full w-full -rotate-90">
      <circle
        cx="140" cy="140" r={R}
        fill="none" stroke="var(--border)" stroke-width="14"
      />
      <circle
        cx="140" cy="140" r={R}
        fill="none" stroke="var(--primary)" stroke-width="14"
        stroke-linecap="round"
        stroke-dasharray={circumference}
        stroke-dashoffset={strokeDashoffset}
        class="transition-[stroke-dashoffset] duration-1000 ease-linear"
        style="filter: drop-shadow(0 0 12px color-mix(in oklch, var(--primary) 60%, transparent));"
      />
    </svg>

    <div class="absolute inset-0 flex flex-col items-center justify-center">
      <span class="text-xs uppercase tracking-[0.25em] text-muted-foreground">
        {currentLabel}
      </span>
      <span class="font-mono text-5xl font-semibold tabular-nums sm:text-6xl">
        {display}
      </span>
      <span class="mt-1 text-xs text-muted-foreground">
        {sessions} {sessions === 1 ? 'sesión' : 'sesiones'} de enfoque
      </span>
    </div>
  </div>

  <!-- Controls -->
  <div class="flex items-center gap-3">
    <button
      class="flex h-12 w-12 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      onclick={resetTimer}
      aria-label="Reiniciar temporizador"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
      </svg>
    </button>

    <button
      class="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      onclick={toggleTimer}
      aria-label={isRunning ? 'Pausar' : 'Iniciar'}
    >
      {#if isRunning}
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"/>
          <rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" class="ml-0.5">
          <polygon points="6,3 20,12 6,21"/>
        </svg>
      {/if}
    </button>

    <button
      class="flex h-12 w-12 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      onclick={nextMode}
      aria-label="Siguiente modo"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5 4 15 12 5 20 5 4"/>
        <line x1="19" y1="5" x2="19" y2="19"/>
      </svg>
    </button>
  </div>

  <p class="text-xs text-muted-foreground">
    Presioná <kbd class="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Espacio</kbd> para iniciar o pausar
  </p>
</section>
