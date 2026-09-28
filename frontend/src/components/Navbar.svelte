<script lang="ts">
  /**
   * Header de desktop. En movil no se renderiza (ver App.svelte): lo
   * reemplaza el TabBar, que vive abajo donde el pulgar llega.
   *
   * Antes de este cambio-desktop y mobile eran dos productos distintos: el
   * header ofrecía Pomo / Estadísticas / Mi perfil / Ajustes, y el TabBar
   * ofrecía Sala / Constancia / Perfil. Cuatro items que apuntaban a vistas
   * que la reescritura de la sala dejó de usar, en una barra que en mobile
   * directamente no existe.
   *
   * Ahora replica el TabBar exactamente, misma lista y misma regla: con una
   * sala abierta, Constancia se bloquea y se explica por qué. Un destino que
   * no hace nada al tocarlo es peor que uno bloqueado con motivo.
   *
   * Lo que el header perdió de acá (Ajustes, Estadísticas, Asistente) no se
   * perdió: vive adentro de Perfil, que es donde corresponde.
   */
  type Tab = 'sala' | 'constancia' | 'perfil';

  let {
    tab = 'sala',
    onChange = () => {},
    haySalaAbierta = false,
  }: {
    tab?: Tab;
    onChange?: (t: Tab) => void;
    haySalaAbierta?: boolean;
  } = $props();

  const TABS: { id: Tab; label: string }[] = [
    { id: 'sala', label: 'Sala' },
    { id: 'constancia', label: 'Constancia' },
    { id: 'perfil', label: 'Perfil' },
  ];

  const bloqueado = (id: Tab) => id === 'constancia' && haySalaAbierta;
</script>

<header class="sticky top-0 z-30 border-b border-border bg-background/80 pt-safe backdrop-blur">
  <div class="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-safe">
    <button
      type="button"
      onclick={() => onChange('sala')}
      class="flex min-tap items-center gap-2 rounded-lg font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      aria-label="La sala, ir a la sala"
    >
      <span
        class="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="pointer-events-none"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </span>
      <span class="text-sm">La sala</span>
    </button>

    <nav class="flex items-center gap-1" aria-label="Navegación principal">
      {#each TABS as t (t.id)}
        <button
          type="button"
          onclick={() => onChange(t.id)}
          disabled={bloqueado(t.id)}
          aria-current={tab === t.id ? 'page' : undefined}
          title={bloqueado(t.id) ? 'Cerrá la sala para ver la constancia' : undefined}
          class="flex min-tap items-center rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring {bloqueado(t.id)
            ? 'cursor-not-allowed text-muted-foreground/40'
            : tab === t.id
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
        >
          {t.label}
        </button>
      {/each}
    </nav>
  </div>
</header>
