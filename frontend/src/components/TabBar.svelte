<script lang="ts">
  /**
   * Barra de pestañas pegada abajo. Solo móvil (lg:hidden).
   *
   * Por qué abajo y no arriba: en un teléfono de 6" la franja superior es la
   * parte más difícil de alcanzar con una mano. Uber, PedidosYa, Morfy y
   * Notion en móvil ponen la navegación primaria abajo por eso. El header
   * con hamburguesa es el patrón desktop shrunk a mobile, y se nota: obliga
   * a un segundo toque para llegar a cualquier cosa.
   *
   * "Sala" y "Constancia" son las dos cosas de trabajo. "Perfil" es la
   * tercera: antes de este cambio era un boton suelto que abria el wizard de
   * bienvenida y nada mas, con lo cual Ajustes, Estadisticas y el asistente
   * se quedaban sin ninguna puerta en mobile. Ahora Perfil es una pestana
   * mas y vive lo que faltaba (ver Perfil.svelte).
   */
  type Tab = 'sala' | 'constancia' | 'perfil';

  interface Props {
    tab: Tab;
    onChange: (t: Tab) => void;
    /** La sala abierta manda: en la pestaña Sala no hay nada más que hacer. */
    haySalaAbierta: boolean;
  }

  let { tab, onChange, haySalaAbierta }: Props = $props();

  const ICONO = {
    sala: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    constancia: 'M3 3v18h18M8 16V11M13 16V7M18 16v-3',
    perfil: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  } as const;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'sala', label: 'Sala' },
    { id: 'constancia', label: 'Constancia' },
    { id: 'perfil', label: 'Perfil' },
  ];
</script>

<!--
  pt-safe arriba porque en landscape el notch queda de costado y la barra
  tiene que despejarlo. pb-safe abajo es la barra de inicio del iPhone.
-->
<nav
  class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur-lg pt-safe pb-safe lg:hidden"
  aria-label="Navegación principal"
>
  <div class="px-safe grid grid-cols-3">
    {#each TABS as t (t.id)}
      <!--
        Con una sala abierta, Constancia queda bloqueado a propósito: la tesis
        es que adentro de una sala no hay nada más en pantalla. Un tab que no
        hace nada al tocarlo es peor que uno bloqueado con razón explícita,
        así que se desactiva y se explica por qué.
      -->
      <button
        type="button"
        onclick={() => onChange(t.id)}
        disabled={t.id === 'constancia' && haySalaAbierta}
        aria-current={tab === t.id ? 'page' : undefined}
        title={t.id === 'constancia' && haySalaAbierta
          ? 'Cerrá la sala para ver la constancia'
          : undefined}
        class="relative flex min-tap flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring {t.id === 'constancia' && haySalaAbierta
          ? 'cursor-not-allowed text-muted-foreground/40'
          : tab === t.id
            ? 'text-primary'
            : 'text-muted-foreground'}"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width={tab === t.id ? 2.2 : 1.8}
          stroke-linecap="round"
          stroke-linejoin="round"
          class="pointer-events-none"
        >
          <path d={ICONO[t.id]} />
        </svg>
        {t.label}
        {#if t.id === 'sala' && haySalaAbierta}
          <span class="sr-only">(sala abierta)</span>
          <span
            aria-hidden="true"
            class="absolute top-2 h-1.5 w-1.5 rounded-full bg-primary"
          ></span>
        {/if}
      </button>
    {/each}

  </div>
</nav>
