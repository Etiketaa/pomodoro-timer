<script lang="ts">
  import { pwa, installApp } from '../lib/pwa.svelte';

  let dismissed = $state(false);
  let busy = $state(false);

  const show = $derived(!dismissed && !pwa.standalone && (pwa.canInstall || pwa.isIOS));

  function dismiss() {
    dismissed = true;
    try { localStorage.setItem('pwa-install-dismissed', '1'); } catch {}
  }

  async function handleInstall() {
    if (busy) return;
    busy = true;
    try { await installApp(); } finally { busy = false; }
  }
</script>

{#if show}
  <div class="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
    <div class="pointer-events-auto flex w-full max-w-md items-center gap-2.5 rounded-full border border-border bg-card/95 py-2 pl-3 pr-2 shadow-xl shadow-black/30 backdrop-blur">
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 shadow-inner">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </div>
      <p class="min-w-0 flex-1 text-sm">
        {#if pwa.canInstall}
          <span class="font-medium">Instalá la app</span>
          <span class="text-muted-foreground"> para acceso rápido y uso offline</span>
        {:else if pwa.isIOS}
          <span class="font-medium">Instalá la app</span>
          <span class="text-muted-foreground"> Compartir → Agregar a Pantalla de Inicio</span>
        {/if}
      </p>
      {#if pwa.canInstall}
        <button
          class="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
          onclick={handleInstall}
          disabled={busy}
        >
          {busy ? 'Instalando…' : 'Instalar'}
        </button>
      {/if}
      <button
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label="Descartar"
        onclick={dismiss}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  </div>
{/if}
