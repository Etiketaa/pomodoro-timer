<script lang="ts">
  import { tasksStore, salaStore, type Sala } from '../lib/stores/singleton';
  import { FRANJA_LABEL } from '../lib/stores/sala.svelte';
  import SalaCerrar from './SalaCerrar.svelte';

  interface Props {
    sala: Sala;
  }

  let { sala }: Props = $props();

  let nota = $state(sala.nota);
  let mostrarCierre = $state(false);

  const tarea = $derived(salaStore.tareaDe(sala, tasksStore.tasks));

  // Sincroniza si la sala cambia (p. ej. al reabrir el historial).
  $effect(() => {
    nota = sala.nota;
  });

  let minutos = $state(0);
  $effect(() => {
    const t = setInterval(() => {
      minutos = Math.max(
        0,
        Math.round((Date.now() - new Date(sala.creadaAt).getTime()) / 60000)
      );
    }, 1000);
    return () => clearInterval(t);
  });

  function guardarNota() {
    salaStore.editarNota(sala.id, nota);
  }

  const energiaDot: Record<string, string> = {
    low: 'bg-sky-400',
    medium: 'bg-amber-400',
    high: 'bg-rose-400',
  };
</script>

<section class="rounded-2xl border border-ring/30 bg-card/60 p-5 md:p-8">
  <!-- El ambiente: franja, energía y tiempo transcurrido. Chico, arriba. -->
  <div class="flex items-center gap-3 text-xs text-muted-foreground">
    <span class="inline-flex items-center gap-1.5">
      <span class="inline-block size-1.5 rounded-full {energiaDot[sala.energia]}"></span>
      energía {sala.energia}
    </span>
    <span aria-hidden="true">·</span>
    <span>{FRANJA_LABEL[sala.franja]}</span>
    <span aria-hidden="true">·</span>
    <span class="tabular-nums">{minutos} min</span>
  </div>

  <!-- El compromiso. Es lo único grande de la pantalla. -->
  <h1 class="mt-4 text-balance text-2xl font-semibold leading-snug md:text-3xl">
    {sala.compromiso}
  </h1>

  {#if tarea}
    <button
      type="button"
      onclick={() => tasksStore.moveTask(tarea.id, 1)}
      class="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      title="Avanzar la tarea (todo → doing → done)"
    >
      <span
        class="inline-block size-1.5 rounded-full {tarea.status === 'doing'
          ? 'bg-amber-400'
          : 'bg-muted-foreground/50'}"
      ></span>
      {tarea.title}
    </button>
  {/if}

  <!-- La nota: contexto para vos, no para la app. -->
  <label class="mt-6 block">
    <span class="text-xs font-medium text-muted-foreground">
      contexto (se guarda solo)
    </span>
    <textarea
      bind:value={nota}
      onblur={guardarNota}
      rows="3"
      placeholder="dónde lo dejé, qué falta, quién lo espera…"
      class="mt-1.5 w-full resize-none rounded-xl border border-border bg-background/40 p-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-ring"
    ></textarea>
  </label>

  <div class="mt-6 flex justify-end">
    <button
      type="button"
      onclick={() => (mostrarCierre = true)}
      class="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
    >
      Salir de la sala
    </button>
  </div>

  {#if mostrarCierre}
    <SalaCerrar sala={sala} onClose={() => (mostrarCierre = false)} />
  {/if}
</section>
