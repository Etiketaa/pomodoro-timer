<script lang="ts">
  import { ATMOSFERA, FRANJA_LABEL, franjaAhora, streamDe, type Estacion, type Franja } from '../lib/stores/sala.svelte';
  import { salaStore } from '../lib/stores/singleton';

  /**
   * La estación por defecto es la de la franja: la de la sala si hay una
   * abierta, si no la de la hora actual. El ambiente viaja con vos esté o no
   * trabajando.
   *
   * El override manual se guarda aparte y gana sobre el default hasta que lo
   * saques con el botón. No se lo ato a la sala porque el ambiente no es
   * parte del compromiso: es tuyo, no del registro.
   */
  const KEY = 'salaAtmosferaV1';

  const franja: Franja = $derived(salaStore.activa?.franja ?? franjaAhora());

  let override = $state<Estacion | null>(null);
  if (typeof localStorage !== 'undefined') {
    try {
      const crudo = localStorage.getItem(KEY);
      if (crudo) {
        const id = JSON.parse(crudo);
        override = Object.values(ATMOSFERA).find((e) => e.id === id) ?? null;
      }
    } catch {
      override = null;
    }
  }

  const porFranja = $derived(ATMOSFERA[franja]);
  const estacion = $derived(override ?? porFranja);
  const esDefault = $derived(override === null);

  let audio: HTMLAudioElement | null = null;
  let playing = $state(false);
  let loading = $state(false);
  let volume = $state(60);
  let muted = $state(false);
  let fallo = $state<string | null>(null);

  $effect(() => {
    if (audio) {
      audio.volume = muted ? 0 : volume / 100;
    }
  });

  /** Cambiar de estación con el audio sonando: recarga la fuente y sigue. */
  $effect(() => {
    const url = streamDe(estacion);
    if (audio && playing && !audio.src.endsWith(url)) {
      audio.src = url;
      audio.play().catch(() => {
        playing = false;
        fallo = 'No se pudo conectar con la radio';
      });
    }
  });

  async function toggle() {
    if (!audio) {
      audio = new Audio();
      audio.preload = 'none';
      audio.onplaying = () => {
        loading = false;
        playing = true;
        fallo = null;
      };
      audio.onpause = () => {
        playing = false;
      };
      audio.onwaiting = () => {
        loading = true;
      };
      audio.onerror = () => {
        loading = false;
        playing = false;
        fallo = 'No se pudo conectar con la radio';
      };
    }
    if (playing) {
      audio.pause();
      playing = false;
      return;
    }
    try {
      loading = true;
      audio.src = streamDe(estacion);
      audio.volume = muted ? 0 : volume / 100;
      await audio.play();
      playing = true;
    } catch {
      playing = false;
      fallo = 'No se pudo conectar con la radio';
    } finally {
      loading = false;
    }
  }

  function toggleMute() {
    muted = !muted;
    if (audio) audio.volume = muted ? 0 : volume / 100;
  }

  function setVolume(v: number) {
    volume = v;
    muted = false;
    if (audio) audio.volume = v / 100;
  }

  function elegir(e: Estacion) {
    override = e;
    try {
      localStorage.setItem(KEY, JSON.stringify(e.id));
    } catch {
      /* sin storage no hay override que recordar; el default sigue */
    }
  }

  function volverAlDefault() {
    override = null;
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* nada que limpiar */
    }
  }
</script>

<div class="flex items-center gap-3 rounded-2xl border border-border bg-card/70 p-3 backdrop-blur">
  <button
    class="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    onclick={toggle}
    aria-label={playing ? 'Pausar radio' : 'Reproducir radio'}
  >
    {#if loading}
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
    {:else if playing}
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16" rx="1"/>
        <rect x="14" y="4" width="4" height="16" rx="1"/>
      </svg>
    {:else}
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="ml-0.5">
        <polygon points="6,3 20,12 6,21"/>
      </svg>
    {/if}
  </button>

  <div class="flex min-w-0 flex-1 flex-col">
    <div class="flex items-center gap-1.5 text-sm font-medium">
      <svg
        xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        class="shrink-0 {playing ? 'text-primary' : 'text-muted-foreground'}"
      >
        <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>
      </svg>
      <span class="truncate">{estacion.nombre}</span>
      {#if !esDefault}
        <span class="shrink-0 rounded-full bg-accent px-1.5 py-px text-[10px] font-normal text-accent-foreground">
          elegiste
        </span>
      {/if}
    </div>
    <span class="truncate text-xs text-muted-foreground">
      {#if fallo}
        {fallo}
      {:else if loading}
        Conectando…
      {:else if playing}
        En vivo · {FRANJA_LABEL[franja]} · {estacion.sePresenta}
      {:else}
        <!--
          "la de {FRANJA_LABEL}" salía como "la de de mañana", porque la
          etiqueta ya viene con la preposición. La flecha lo dice sin
          repetirla.
        -->
        En pausa · {FRANJA_LABEL[franja]} → {porFranja.nombre}
      {/if}
    </span>
  </div>

  <div class="flex items-center gap-2">
    <!--
      El selector es un <select> nativo y no un popover a propósito: es la
      forma más barata de no romper teclado ni lector de pantalla, y en esta
      app lo raro es que algo se abra en capas.
    -->
    <label class="sr-only" for="estacion">Estación de radio</label>
    <select
      id="estacion"
      value={estacion.id}
      onchange={(ev) => {
        const elegida = Object.values(ATMOSFERA).find(
          (e) => e.id === (ev.currentTarget as HTMLSelectElement).value
        );
        if (elegida) elegir(elegida);
      }}
      class="min-tap max-w-[9.5rem] rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus-visible:border-ring"
    >
      {#each Object.entries(ATMOSFERA) as [f, e] (e.id)}
        <option value={e.id}>{e.nombre}</option>
      {/each}
    </select>

    {#if !esDefault}
      <button
        class="min-tap rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        onclick={volverAlDefault}
        title={`Volver a la estación de ${FRANJA_LABEL[franja]}: ${porFranja.nombre}`}
      >
        auto
      </button>
    {/if}

    <button
      class="flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      onclick={toggleMute}
      aria-label={muted ? 'Activar sonido' : 'Silenciar'}
    >
      {#if muted || volume === 0}
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
        </svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </svg>
      {/if}
    </button>
<!--
        El slider medía 6px de alto: esa era también su área de toque, que es
        lo que hace inalcanzable un control a 1px de la fila correcta. Acá el
        input mide 44 y la pista visible sigue siendo finita, dibujada a mano
        porque `appearance-none` borra la nativa. El -5px del pulgar es
        ((pista 6 - pulgar 16) / 2): lo centra sobre la pista.
      -->
    <input
      type="range"
      min="0" max="100"
      value={muted ? 0 : volume}
      oninput={(e) => setVolume(parseInt((e.target as HTMLInputElement).value))}
      aria-label="Volumen"
      class="hidden h-11 w-24 cursor-pointer appearance-none bg-transparent sm:block
        [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted
        [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary
        [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-muted
        [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary"
    />
  </div>
</div>
