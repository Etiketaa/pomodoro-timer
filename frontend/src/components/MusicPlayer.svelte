<script lang="ts">
  const STREAMS = [
    { id: 'lofi', name: 'Lofi Girl', url: 'https://streams.ilovemusic.de/iloveradio17.mp3' },
    { id: 'jazz', name: 'Smooth Jazz', url: 'https://streams.ilovemusic.de/iloveradio14.mp3' },
    { id: 'chill', name: 'Chillhop', url: 'https://streams.ilovemusic.de/iloveradio16.mp3' },
    { id: 'classical', name: 'Classical', url: 'https://streams.ilovemusic.de/iloveradio19.mp3' },
    { id: 'rain', name: 'Rain', url: 'https://streams.ilovemusic.de/iloveradio21.mp3' },
  ];

  let audio: HTMLAudioElement | null = null;
  let activeStreamId = $state<string | null>(null);
  let isPlaying = $state(false);
  let isMuted = $state(false);
  let volume = $state(0.6);

  function toggleStream(id: string, url: string) {
    if (activeStreamId === id && isPlaying) {
      audio?.pause();
      isPlaying = false;
      return;
    }
    if (activeStreamId !== id) {
      audio?.pause();
      audio = new Audio(url);
      audio.volume = volume;
      activeStreamId = id;
    }
    audio?.play().then(() => { isPlaying = true; }).catch(() => {});
  }

  function toggleMute() {
    if (!audio) return;
    isMuted = !isMuted;
    audio.muted = isMuted;
  }

  function setVolume(v: number) {
    volume = v;
    if (audio) audio.volume = v;
  }

  function stop() {
    audio?.pause();
    audio = null;
    activeStreamId = null;
    isPlaying = false;
  }

  const activeName = $derived(STREAMS.find(s => s.id === activeStreamId)?.name ?? '');
</script>

<div class="card flex flex-col gap-2">
  <!-- Mobile: compact row -->
  <div class="flex items-center gap-2 sm:hidden">
    {#if isPlaying}
      <button class="btn btn-ghost p-1.5 rounded-lg shrink-0" onclick={stop} aria-label="Detener">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <span class="text-xs truncate min-w-0 flex-1">{activeName}</span>
      <button class="btn btn-ghost p-1.5 rounded-lg shrink-0" onclick={toggleMute} aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}>
        {#if isMuted}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
          </svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
          </svg>
        {/if}
      </button>
    {:else}
      <button class="btn btn-ghost p-1.5 rounded-lg shrink-0" onclick={() => toggleStream('lofi', STREAMS[0].url)} aria-label="Reproducir Lofi">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="6,3 20,12 6,21"/>
        </svg>
      </button>
      <span class="text-xs text-[var(--color-muted)]">Música</span>
    {/if}
  </div>

  <!-- Desktop: full controls -->
  <div class="hidden sm:flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
        </svg>
        <span class="text-xs font-semibold">Música</span>
      </div>
      {#if isPlaying}
        <button class="text-[var(--color-muted)] hover:text-[var(--color-accent-red)] text-[10px] transition-colors" onclick={stop}>
          Detener
        </button>
      {/if}
    </div>

    <div class="flex gap-1">
      {#each STREAMS as stream}
        <button
          class="flex-1 py-1.5 px-1 rounded-lg text-[10px] font-medium transition-all"
          class:bg-[var(--color-primary)]={activeStreamId === stream.id && isPlaying}
          class:text-[var(--color-background)]={activeStreamId === stream.id && isPlaying}
          class:bg-[var(--color-card)]={activeStreamId !== stream.id || !isPlaying}
          class:text-[var(--color-muted)]={activeStreamId !== stream.id || !isPlaying}
          onclick={() => toggleStream(stream.id, stream.url)}
        >
          {stream.name}
        </button>
      {/each}
    </div>

    {#if isPlaying}
      <div class="flex items-center gap-2">
        <button class="p-1 rounded" onclick={toggleMute} aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}>
          {#if isMuted}
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          {/if}
        </button>
        <input
          type="range"
          min="0" max="1" step="0.05"
          value={volume}
          oninput={(e) => setVolume(parseFloat((e.target as HTMLInputElement).value))}
          class="flex-1 h-1 appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-primary)]"
        />
      </div>
    {/if}
  </div>
</div>
