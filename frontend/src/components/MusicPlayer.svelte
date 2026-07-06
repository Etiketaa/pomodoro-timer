<script lang="ts">
  type Track = {
    id: string;
    title: string;
    artist: string;
    duration: number;
    url?: string;
  };

  const PRESET_TRACKS: Track[] = [
    { id: '1', title: 'Lo-fi Beats', artist: 'Study Music', duration: 1800, url: '' },
    { id: '2', title: 'Rain Sounds', artist: 'Ambient', duration: 1800, url: '' },
    { id: '3', title: 'Classical Piano', artist: 'Focus Playlist', duration: 1800, url: '' },
    { id: '4', title: 'Nature Sounds', artist: 'Relaxation', duration: 1800, url: '' },
    { id: '5', title: 'Deep Focus', artist: 'Concentration', duration: 1800, url: '' },
  ];

  let currentTrack = $state<Track | null>(null);
  let isPlaying = $state(false);
  let volume = $state(75);
  let currentTime = $state(0);
  let showPlaylist = $state(false);

  const progress = $derived(currentTrack ? currentTime / currentTrack.duration : 0);
  const displayTime = $derived(formatTime(currentTime));
  const displayDuration = $derived(currentTrack ? formatTime(currentTrack.duration) : '--:--');

  function formatTime(s: number): string {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function playTrack(track: Track) {
    currentTrack = track;
    isPlaying = true;
    currentTime = 0;
    showPlaylist = false;
    // Simulate playback progress
    if (track.id !== currentTrack?.id) {
      const interval = setInterval(() => {
        if (!isPlaying) return;
        currentTime += 1;
        if (currentTime >= track.duration) {
          isPlaying = false;
          currentTime = 0;
          clearInterval(interval);
        }
      }, 1000);
    }
  }

  function togglePlay() {
    isPlaying = !isPlaying;
  }

  function stop() {
    isPlaying = false;
    currentTime = 0;
    currentTrack = null;
  }
</script>

<div class="card flex flex-col gap-3">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
      </svg>
      <h3 class="text-sm font-semibold text-text">Music</h3>
    </div>
    {#if currentTrack}
      <button class="text-text-muted hover:text-accent-red text-xs transition-colors" onclick={stop}>
        Stop
      </button>
    {:else}
      <button class="text-text-muted hover:text-text text-xs transition-colors" onclick={() => showPlaylist = !showPlaylist}>
        {showPlaylist ? 'Hide' : 'Browse'}
      </button>
    {/if}
  </div>

  {#if showPlaylist}
    <div class="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
      {#each PRESET_TRACKS as track}
        <button
          class="w-full glass rounded-lg p-3 flex items-center gap-3 hover:border-primary/40 transition-all text-left group"
          onclick={() => playTrack(track)}
        >
          <div class="w-10 h-10 rounded-lg bg-bg-elevated flex items-center justify-center group-hover:bg-accent-purple/20 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="10,5 20,12 10,19"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-text text-sm font-medium truncate">{track.title}</p>
            <p class="text-text-muted text-xs">{track.artist}</p>
          </div>
          <span class="text-text-muted text-xs tabular-nums">{formatTime(track.duration)}</span>
        </button>
      {/each}
    </div>
  {:else if currentTrack && isPlaying}
    <div class="flex items-center gap-3">
      <button class="p-2 rounded-full hover:bg-border/20 transition-colors" onclick={togglePlay} aria-label="Pause">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="var(--accent-purple)">
          <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
      </button>
      <div class="flex-1 min-w-0">
        <p class="text-text text-sm font-medium truncate">{currentTrack.title}</p>
        <p class="text-text-muted text-xs">{currentTrack.artist}</p>
      </div>
      <span class="text-text-muted text-xs tabular-nums">{displayTime}</span>
    </div>

    <!-- Progress bar -->
    <div class="h-1 bg-border/30 rounded-full overflow-hidden">
      <div class="h-full rounded-full transition-all duration-1000 ease-linear" style="background: var(--accent-purple); width: {progress * 100}%;"></div>
    </div>
  {:else if currentTrack && !isPlaying}
    <div class="flex items-center gap-3 opacity-60">
      <button class="p-2 rounded-full hover:bg-border/20 transition-colors" onclick={togglePlay} aria-label="Play">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="var(--accent-purple)" class="ml-0.5">
          <polygon points="6,3 20,12 6,21"/>
        </svg>
      </button>
      <div class="flex-1 min-w-0">
        <p class="text-text text-sm font-medium truncate">{currentTrack.title}</p>
        <p class="text-text-muted text-xs">{currentTrack.artist}</p>
      </div>
      <span class="text-text-muted text-xs tabular-nums">Paused</span>
    </div>
  {:else}
    <div class="flex flex-col items-center justify-center py-6 text-text-muted/50">
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
      </svg>
      <p class="text-xs mt-2">Select music to focus</p>
    </div>
  {/if}
</div>

<style>
  .scrollbar-thin::-webkit-scrollbar { width: 4px; }
  .scrollbar-thin::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
</style>