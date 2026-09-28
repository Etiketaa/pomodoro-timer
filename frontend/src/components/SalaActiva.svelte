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

<!--
  Full-bleed en móvil: el compromiso va a sangre, sin caja ni borde. Eso es
  lo que separa el patrón de Notion del patrón de "un panel redondeado más":
  en un teléfono la caja no contiene nada, solo agrega padding y una línea
  que separar. En desktop vuelve la caja, porque ahí sí organiza.
-->
<section class="lg:rounded-2xl lg:border lg:border-ring/30 lg:bg-card/60 lg:p-8">
  <!-- El ambiente: franja, energía y tiempo. Chico, arriba, sin estridar. -->
  <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
    <span class="inline-flex items-center gap-1.5">
      <span
        class="inline-block size-1.5 rounded-full {energiaDot[sala.energia]}"
      ></span>
      energía {sala.energia}
    </span>
    <span aria-hidden="true">·</span>
    <span>{FRANJA_LABEL[sala.franja]}</span>
    <span aria-hidden="true">·</span>
    <span class="tabular-nums">{minutos} min</span>
  </div>

  <!-- El compromiso. Lo único grande de la pantalla. -->
  <h1
    class="mt-3 text-balance text-[1.75rem] font-semibold leading-tight lg:mt-4 lg:text-3xl lg:leading-snug"
  >
    {sala.compromiso}
  </h1>

  {#if tarea}
    <button
      type="button"
      onclick={() => tasksStore.moveTask(tarea.id, 1)}
      class="mt-4 inline-flex min-tap items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
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
  <label class="mt-5 block">
    <span class="text-xs font-medium text-muted-foreground">
      contexto (se guarda solo)
    </span>
    <textarea
      bind:value={nota}
      onblur={guardarNota}
      rows="3"
      placeholder="dónde lo dejé, qué falta, quién lo espera…"
      class="mt-1.5 w-full resize-none rounded-xl border border-border bg-background/40 p-3 text-base outline-none placeholder:text-muted-foreground/50 focus:border-ring lg:text-sm"
    ></textarea>
  </label>

  <!--
    En móvil la acción principal queda FIJA abajo, encima de la barra de
    pestañas: es el patrón del checkout de PedidosYa y del botón de confirmar
    de Uber. El pulgar llega sin soltar el teléfono y no hay que scrollear
    para cerrar la sala, que es la única cosa que querés hacer al salir.
  -->
  <div class="mt-4 hidden justify-end lg:flex">
    <button
      type="button"
      onclick={() => (mostrarCierre = true)}
      class="min-tap rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
    >
      Salir de la sala
    </button>
  </div>
</section>

<!-- CTA fijo: solo móvil. pb-safe + la barra de pestañas de 60px. -->
<div
  class="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/85 px-safe pt-3 backdrop-blur-lg lg:hidden"
  style="padding-bottom: calc(var(--tabbar) + var(--safe-b))"
>
  <button
    type="button"
    onclick={() => (mostrarCierre = true)}
    style="height: var(--cta)"
    class="w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity active:opacity-80"
  >
    Salir de la sala
  </button>
</div>

{#if mostrarCierre}
  <SalaCerrar sala={sala} onClose={() => (mostrarCierre = false)} />
{/if}
