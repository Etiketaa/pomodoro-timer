<script lang="ts">
  import { tasksStore, salaStore, type Energy } from '../lib/stores/singleton';
  import { FRANJA_LABEL, franjaAhora } from '../lib/stores/sala.svelte';

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
   * Abrir una sala = escribir el compromiso. Eso es todo lo que se pide.
   *
   * La tentación de poner un campo de duración acá es exactamente la que
   * mata el producto: el pomodoro tiene que ser mecánica interna, no un
   * formulario. Si querés una estimación, la escribís vos como parte de la
   * frase ("hoy saco el borrador del contrato").
   */
  let compromiso = $state('');
  let taskId = $state<string | undefined>(undefined);
  let energia = $state<Energy>('medium');

  const franja = $derived(franjaAhora());
  const pendientes = $derived(
    tasksStore.tasks.filter((t) => t.status !== 'done' && !t.parentId)
  );

  function abrir() {
    if (!compromiso.trim()) return;
    salaStore.abrir(compromiso, taskId, energia);
    compromiso = '';
    taskId = undefined;
    energia = 'medium';
  }

  function alEnter(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      abrir();
    }
  }
</script>

<section class="rounded-2xl border border-border bg-card/40 p-5 md:p-6">
  <svelte:element this={nivelEncabezado === 1 ? 'h1' : 'h2'} class="text-base font-semibold">
    Abrir sala
  </svelte:element>

  <p class="mt-1 text-sm text-muted-foreground text-pretty">
    Escribí qué terminás. Es la frase que vas a ver mientras trabajás.
  </p>

  <textarea
    bind:value={compromiso}
    onkeydown={alEnter}
    rows="2"
    placeholder="hoy termino el borrador del contrato"
    aria-label="Frase de compromiso"
    class="mt-4 w-full resize-none rounded-xl border border-border bg-background/60 p-3 text-base outline-none placeholder:text-muted-foreground/60 focus:border-ring"
  ></textarea>

  <div class="mt-4 grid gap-3 sm:grid-cols-2">
    <label class="flex flex-col gap-1.5">
      <span class="text-xs font-medium text-muted-foreground">
        sobre qué (opcional)
      </span>
      <select
        bind:value={taskId}
        class="min-tap rounded-lg border border-border bg-background/60 p-2 text-sm outline-none focus:border-ring"
      >
        <option value={undefined}>Sin tarea</option>
        {#each pendientes as t (t.id)}
          <option value={t.id}>{t.title}</option>
        {/each}
      </select>
    </label>

    <label class="flex flex-col gap-1.5">
      <span class="text-xs font-medium text-muted-foreground">energía</span>
      <div class="flex gap-1.5">
        {#each [['low', 'baja'], ['medium', 'media'], ['high', 'alta']] as const as [val, lbl] (val)}
          <button
            type="button"
            onclick={() => (energia = val)}
            aria-pressed={energia === val}
            class="min-tap flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors {
              energia === val
                ? 'border-ring bg-accent text-accent-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            }"
          >
            {lbl}
          </button>
        {/each}
      </div>
    </label>
  </div>

  <div class="mt-5 flex items-center justify-between gap-3">
    <p class="text-xs text-muted-foreground">
      Son las <span class="text-foreground/80">{FRANJA_LABEL[franja]}</span>.
    </p>
    <button
      type="button"
      onclick={abrir}
      disabled={!compromiso.trim()}
      class="min-tap rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
    >
      Entrar
    </button>
  </div>
</section>
