<script lang="ts">
  let dismissed = $state(false);
  let deferredPrompt = $state<any>(null);

  $effect(() => {
    function handler(e: Event) {
      e.preventDefault();
      deferredPrompt = e;
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  });

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      dismissed = true;
    }
    deferredPrompt = null;
  }

  function dismiss() {
    dismissed = true;
    localStorage.setItem('pwa-banner-dismissed', '1');
  }

  const isDismissed = $derived(dismissed || localStorage.getItem('pwa-banner-dismissed') === '1');
</script>

{#if !isDismissed && deferredPrompt}
  <div
    class="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]"
  >
    <div class="glass-strong rounded-2xl px-4 py-2.5 flex items-center gap-3 max-w-sm w-full mb-2">
      <div class="w-8 h-8 rounded-lg bg-[var(--color-primary)]/20 flex items-center justify-center shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-medium">Instalar Pomodoro</p>
        <p class="text-[10px] text-[var(--color-muted)]">Acceso rápido desde tu pantalla de inicio</p>
      </div>
      <button class="btn btn-primary text-[10px] px-3 py-1.5 shrink-0" onclick={install}>
        Instalar
      </button>
      <button class="p-1 rounded text-[var(--color-muted)] hover:text-[var(--color-foreground)] shrink-0" onclick={dismiss} aria-label="Cerrar">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </div>
{/if}
