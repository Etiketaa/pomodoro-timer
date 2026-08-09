<script lang="ts">
  let { onSettings = () => {}, onStats = () => {}, onChatbot = () => {} }: {
    onSettings: () => void;
    onStats: () => void;
    onChatbot: () => void;
  } = $props();

  let open = $state(false);
</script>

<header class="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
  <div class="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
    <a href="/" class="flex items-center gap-2 font-semibold">
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      </span>
      <span class="text-sm">Lofi Pomodoro</span>
    </a>

    <!-- Desktop actions -->
    <nav class="hidden items-center gap-1 sm:flex">
      <button
        aria-label="Notificaciones"
        class="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
      </button>
      <button class="ml-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        Entrar
      </button>
    </nav>

    <!-- Mobile menu button -->
    <button
      class="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:hidden"
      onclick={() => open = !open}
      aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
      aria-expanded={open}
    >
      {#if open}
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
        </svg>
      {/if}
    </button>
  </div>

  <!-- Mobile dropdown -->
  <div
    class="grid overflow-hidden border-t border-border transition-all sm:hidden"
    class:grid-rows-[1fr]={open}
    class:grid-rows-[0fr]={!open}
    class:border-t-0={!open}
  >
    <div class="min-h-0">
      <nav class="flex flex-col gap-1 p-4">
        <button class="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
          </svg>
          Notificaciones
        </button>
        <button class="mt-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
          Entrar
        </button>
      </nav>
    </div>
  </div>
</header>
