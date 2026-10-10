<script lang="ts">
  import { salaStore, type SalaResultado } from '../lib/stores/singleton';
  import { RESULTADO_LABEL } from '../lib/stores/sala.svelte';

  /**
   * `nivelEncabezado` decide si el encabezado es h1 o h2, y lo pasa App.svelte segun
   * cual vista esta activa. En mobile esta es la pantalla entera y le
   * corresponde h1; en desktop convive con la otra seccion como hermana, y ahi
   * es h2. Asi hay exactamente un h1 en cualquier estado, que era lo que faltaba.
   *
   * De paso el encabezado deja de ser una etiqueta en versalitas gris y pasa a
   * ser un titulo: era la pantalla de apertura de la app y no tenia ningun h1.
   */
  let { nivelEncabezado = 1 }: { nivelEncabezado?: 1 | 2 } = $props();

  /**
   * Historial de salas. El foco NO es la racha sino el mapa de calor: Lally
   * et al. (2010) dan una mediana de 66 días hasta automaticidad con un rango
   * de 18 a 254. Una racha que se rompe castiga justo a la gente que tarda
   * más, que es la mayoría — y los castiga harder cuanto más cerca estaban.
   */
  const SALAS_LASTIMOS = 12;

  let abiertas = $state(false);
  let mostrar = $derived(abiertas ? salaStore.historial : salaStore.historial.slice(0, SALAS_LASTIMOS));

  const nivel: Record<SalaResultado, string> = {
    terminado: 'bg-emerald-500/70',
    parcial: 'bg-amber-500/60',
    abandonado: 'bg-border',
  };

  function fecha(corta: string) {
    const d = new Date(corta);
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  }

  function borrar(id: string, e: Event) {
    e.stopPropagation();
    if (confirm('¿Borrar esta sala del historial?')) salaStore.borrar(id);
  }
</script>

<section class="rounded-2xl border border-border bg-card/40 p-5">
  <div class="flex items-baseline justify-between">
    <svelte:element this={nivelEncabezado === 1 ? 'h1' : 'h2'} class="text-base font-semibold">
      Constancia
    </svelte:element>
    <p class="text-xs text-muted-foreground tabular-nums">
      {salaStore.terminadas}/{salaStore.totalCerradas} terminadas · 12 semanas
    </p>
  </div>

  <!-- Mapa de calor: 12 semanas x 7 días. Fallar un día no resetea nada. -->
  <div
    class="mt-3 grid grid-flow-col grid-rows-7 gap-[3px]"
    role="img"
    aria-label="Mapa de calor de salas cerradas en las últimas 12 semanas"
  >
    {#each salaStore.constancia as d (d.date)}
      <span
        title="{d.count} sala{d.count === 1 ? '' : 's'} el {fecha(d.date)}"
        class="aspect-square w-[9px] rounded-[2px] {
          d.count === 0
            ? 'bg-border/40'
            : d.count === 1
              ? 'bg-emerald-500/45'
              : 'bg-emerald-500'
        }"
      ></span>
    {/each}
  </div>

  <h3 class="mt-6 text-sm font-semibold">Salas</h3>

  {#if salaStore.historial.length === 0}
    <p class="mt-2 text-sm text-muted-foreground">
      Todavía no cerraste ninguna. Abrí una arriba.
    </p>
  {:else}
    <ul class="mt-2 flex flex-col divide-y divide-border/60">
      {#each mostrar as s (s.id)}
        <li class="group flex items-start gap-3 py-3">
          <span
            class="mt-1.5 inline-block size-2 shrink-0 rounded-full {nivel[s.resultado ?? 'abandonado']}"
            title={RESULTADO_LABEL[s.resultado ?? 'abandonado']}
          ></span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm">{s.compromiso}</p>
            <p class="mt-0.5 text-xs text-muted-foreground">
              {RESULTADO_LABEL[s.resultado ?? 'abandonado']}
              {#if s.minutos}· {s.minutos} min{/if}
              {#if s.cerradaAt}· {fecha(s.cerradaAt)}{/if}
            </p>
            {#if s.nota?.trim()}
              <!--
                La nota que escribiste durante la sesión, textual. Se muestra
                recién acá y en el cierre, en los dos con el mismo lenguaje
                visual: borde izquierdo + fondo muted + whitespace-pre-wrap,
                para que "tu nota" se reconozca igual donde aparezca.
              -->
              <p
                class="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-r-xl border-l-2 border-ring/40 bg-muted/40 py-2 pl-3 pr-3 text-xs text-muted-foreground text-pretty"
              >
                {s.nota}
              </p>
            {/if}
            {#if s.proximaAccion}
              <p class="mt-1 text-xs text-muted-foreground/90">
                <span class="text-foreground/60">seguir:</span>
                {s.proximaAccion}
              </p>
            {/if}
          </div>
          <!--
            El ícono mide 14px y el área de toque era 22px: menos de la mitad
            del mínimo de 48px que la app se propone, y además con
            `opacity-0` + `group-hover`, que en táctil no hay hover. Era un
            botón que no se veía ni se podía tocar justo en el caso para el
            que está diseñado.

            Ahora el área es .min-tap (48px) con el ícono centrado, y el
            desvanecido solo donde hay hover de verdad: en puntero grueso se
            muestra siempre, atenuado.
          -->
          <button
            type="button"
            onclick={(e) => borrar(s.id, e)}
            aria-label="Borrar sala del historial"
            class="flex min-tap shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-70 transition-opacity hover:text-destructive hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="pointer-events-none">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            </svg>
          </button>
        </li>
      {/each}
    </ul>

    {#if salaStore.historial.length > SALAS_LASTIMOS}
      <button
        type="button"
        onclick={() => (abiertas = !abiertas)}
        class="mt-3 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        {abiertas ? 'ver menos' : `ver las ${salaStore.historial.length} salas`}
      </button>
    {/if}
  {/if}
</section>
