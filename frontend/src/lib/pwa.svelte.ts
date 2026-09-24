// PWA helper: registro de service worker + captura del prompt de instalación.
// Archivo .svelte.ts para poder usar runes ($state) y exponer reactividad al UI.

type DeferredPrompt = {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export const pwa = $state({
  canInstall: false,
  isIOS: false,
  standalone: false,
});

let deferredPrompt: DeferredPrompt | null = null;

export function registerPWA(): void {
  // Registrar service worker (precache del build + offline en lo posible)
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err: unknown) => console.warn('SW registration failed:', err));
  }

  // Detectar iOS Safari (no dispara beforeinstallprompt; instalación manual)
  pwa.isIOS =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (typeof navigator !== 'undefined' && 'standalone' in navigator);

  // Ya instalado como standalone (iOS usa navigator.standalone)
  pwa.standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-expect-error propiedad específica de iOS Safari
    Boolean(navigator.standalone);

  if (pwa.standalone) {
    pwa.canInstall = false;
    return;
  }

  // Capturar el prompt de instalación (Chrome/Edge/desktop y Android)
  window.addEventListener('beforeinstallprompt', (event: Event) => {
    event.preventDefault();
    deferredPrompt = event as unknown as DeferredPrompt;
    pwa.canInstall = true;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    pwa.canInstall = false;
    pwa.standalone = true;
  });
}

/** Invoca el prompt de instalación del navegador. Devuelve true si se mostró. */
export async function installApp(): Promise<boolean> {
  if (!deferredPrompt) return false;
  const prompt = deferredPrompt;
  deferredPrompt = null;
  pwa.canInstall = false;
  try {
    await prompt.prompt();
    await prompt.userChoice;
    return true;
  } catch {
    return false;
  }
}