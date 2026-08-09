<script lang="ts">
  const STREAM_URL = 'https://ice1.somafm.com/groovesalad-128-mp3';

  let audio: HTMLAudioElement | null = null;
  let playing = $state(false);
  let loading = $state(false);
  let volume = $state(60);
  let muted = $state(false);

  $effect(() => {
    if (audio) {
      audio.volume = muted ? 0 : volume / 100;
    }
  });

  async function toggle() {
    if (!audio) {
      audio = new Audio();
      audio.preload = 'none';
      audio.onplaying = () => { loading = false; playing = true; };
      audio.onpause = () => { playing = false; };
      audio.onwaiting = () => { loading = true; };
    }
    if (playing) {
      audio.pause();
      playing = false;
      return;
    }
    try {
      loading = true;
      audio.src = STREAM_URL;
      audio.volume = muted ? 0 : volume / 100;
      await audio.play();
      playing = true;
    } catch {
      playing = false;
    } finally {
      loading = false;
    }
  }

  function toggleMute() {
    muted = !muted;
    if (audio) audio.volume = muted ? 0 : volume / 100;
  }

  function setVolume(v: number) {
    volume = v;
    muted = false;
    if (audio) audio.volume = v / 100;
  }
</script>

<div class="flex items-center gap-3 rounded-2xl border border-border bg-card/70 p-3 backdrop-blur">
  <button
    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    onclick={toggle}
    aria-label={playing ? 'Pausar radio' : 'Reproducir radio'}
  >
    {#if loading}
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
    {:else if playing}
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16" rx="1"/>
        <rect x="14" y="4" width="4" height="16" rx="1"/>
      </svg>
    {:else}
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="ml-0.5">
        <polygon points="6,3 20,12 6,21"/>
      </svg>
    {/if}
  </button>

  <div class="flex min-w-0 flex-1 flex-col">
    <div class="flex items-center gap-1.5 text-sm font-medium">
      <svg
        xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        class="shrink-0 {playing ? 'text-primary' : 'text-muted-foreground'}"
      >
        <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>
      </svg>
      <span class="truncate">SomaFM · Groove Salad</span>
    </div>
    <span class="truncate text-xs text-muted-foreground">
      {loading ? 'Conectando…' : playing ? 'En vivo · beats para concentrarte' : 'Pausado'}
    </span>
  </div>

  <div class="flex items-center gap-2">
    <button
      class="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      onclick={toggleMute}
      aria-label={muted ? 'Activar sonido' : 'Silenciar'}
    >
      {#if muted || volume === 0}
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
        </svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </svg>
      {/if}
    </button>
    <input
      type="range"
      min="0" max="100"
      value={muted ? 0 : volume}
      oninput={(e) => setVolume(parseInt((e.target as HTMLInputElement).value))}
      aria-label="Volumen"
      class="hidden h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-muted accent-primary sm:block"
    />
  </div>
</div>
