<script lang="ts">
  let { onSettings = () => {}, onStats = () => {}, onChatbot = () => {} }: {
    onSettings: () => void;
    onStats: () => void;
    onChatbot: () => void;
  } = $props();

  let menuOpen = $state(false);

  let currentTime = $state(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
  let currentDate = $state(new Date().toLocaleDateString('es-AR', { weekday: 'long', month: 'long', day: 'numeric' }));

  $effect(() => {
    const interval = setInterval(() => {
      currentTime = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      currentDate = new Date().toLocaleDateString('es-AR', { weekday: 'long', month: 'long', day: 'numeric' });
    }, 1000);
    return () => clearInterval(interval);
  });

  function closeMenu() { menuOpen = false; }
</script>

<header class="sticky top-0 z-50 px-4 py-3">
  <nav class="glass-strong rounded-2xl px-4 py-2.5 flex items-center justify-between">
    <!-- Logo -->
    <div class="flex items-center gap-2.5">
      <div class="w-8 h-8 rounded-lg bg-[var(--color-primary)]/20 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
      <div class="hidden sm:block">
        <h1 class="text-sm font-bold leading-none">Pomodoro</h1>
        <p class="text-[10px] text-[var(--color-muted)] leading-tight">{currentDate}</p>
      </div>
    </div>

    <!-- Desktop: actions -->
    <div class="hidden md:flex items-center gap-1.5">
      <!-- Clock -->
      <span class="text-xs font-mono text-[var(--color-muted)] tabular-nums mr-2">{currentTime}</span>

      <button class="btn btn-ghost p-2 rounded-xl" onclick={onChatbot} aria-label="Asistente">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
      <button class="btn btn-ghost p-2 rounded-xl" onclick={onStats} aria-label="Estadísticas">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      </button>
      <button class="btn btn-ghost p-2 rounded-xl" onclick={onSettings} aria-label="Configuración">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>
    </div>

    <!-- Mobile: hamburger -->
    <div class="md:hidden relative">
      <button class="btn btn-ghost p-2 rounded-xl" onclick={() => menuOpen = !menuOpen} aria-label="Menú" aria-expanded={menuOpen}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          {#if menuOpen}
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          {:else}
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          {/if}
        </svg>
      </button>

      {#if menuOpen}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="fixed inset-0 z-40" onclick={closeMenu}></div>
        <div class="absolute right-0 top-full mt-2 z-50 glass-strong rounded-xl py-1 min-w-[160px] animate-scaleIn">
          <span class="block px-4 py-2 text-[10px] text-[var(--color-muted)] font-mono tabular-nums">{currentTime}</span>
          <button class="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 flex items-center gap-2.5" onclick={() => { onChatbot(); closeMenu(); }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Asistente
          </button>
          <button class="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 flex items-center gap-2.5" onclick={() => { onStats(); closeMenu(); }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Estadísticas
          </button>
          <button class="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 flex items-center gap-2.5" onclick={() => { onSettings(); closeMenu(); }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Configuración
          </button>
        </div>
      {/if}
    </div>
  </nav>
</header>

<style>
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95) translateY(-4px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  .animate-scaleIn { animation: scaleIn 0.15s ease-out; }
</style>
