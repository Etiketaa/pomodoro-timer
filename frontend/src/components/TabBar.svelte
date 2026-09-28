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
   * Solo dos destinos reales. "Sala" y "Constancia" son las dos cosas que
   * existen. Ajustes abre el modal que ya había, pero desde el pulgar en vez
   * de desde un menú desplegable arriba a la izquierda.
   */
  type Tab = 'sala' | 'constancia';

  interface Props {
    tab: Tab;
    onChange: (t: Tab) => void;
    onProfile: () => void;
    /** La sala abierta manda: en la pestaña Sala no hay nada más que hacer. */
    haySalaAbierta: boolean;
  }

  let { tab, onChange, onProfile, haySalaAbierta }: Props = $props();

  const ICONO = {
    sala: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    constancia: 'M3 3v18h18M8 16V11M13 16V7M18 16v-3',
    ajustes: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  } as const;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'sala', label: 'Sala' },
    { id: 'constancia', label: 'Constancia' },
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

    <!--
      Se llama Perfil y no Ajustes porque abre el perfil. En móvil no hay otro
      camino a Ajustes: vive adentro del perfil, como en casi toda app
      mobile. En desktop queda accesible directo desde el header.
    -->
    <button
      type="button"
      onclick={onProfile}
      class="flex min-tap flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="pointer-events-none"
      >
        <path d={ICONO.ajustes} />
      </svg>
      Perfil
    </button>
  </div>
</nav>
