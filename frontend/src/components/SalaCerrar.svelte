<script lang="ts">
  import { tasksStore, salaStore, type Sala, type SalaResultado } from '../lib/stores/singleton';
  import { RESULTADO_LABEL } from '../lib/stores/sala.svelte';

  interface Props {
    sala: Sala;
    onClose: () => void;
  }

  let { sala, onClose }: Props = $props();

  let resultado = $state<SalaResultado | null>(null);
  let proximaAccion = $state('');
  let error = $state('');

  const OPCIONES: { valor: SalaResultado; ayuda: string }[] = [
    { valor: 'terminado', ayuda: 'Está hecho. Se cierra acá.' },
    { valor: 'parcial', ayuda: 'Avancé, falta lo que sigue debajo.' },
    { valor: 'abandonado', ayuda: 'No lo toqué. Sirve igual dejarlo escrito.' },
  ];

  const falta = $derived(resultado !== null && resultado !== 'terminado');

  // La nota que escribiste durante la sesión, re-leída acá. Antes se guardaba
  // y no volvía a aparecer nunca: el ritual te preguntaba "¿lo terminaste?"
  // escondiendo justo lo que anotaste mientras trabajabas. Eso convertía la
  // pregunta en un examen de memoria. Con la nota a la vista podés verificar
  // en vez de adivinar. Se muestra solo si hay algo escrito.
  const nota = $derived(sala.nota.trim());

  function confirmar() {
    if (!resultado) {
      error = 'Elegí cómo terminó.';
      return;
    }
    const r = salaStore.cerrar(sala.id, resultado, proximaAccion);
    if (!r.ok) {
      error = r.error ?? 'No se pudo cerrar.';
      return;
    }
    // La tarea de la sala pasa a done solo si terminó de verdad.
    if (resultado === 'terminado' && sala.taskId) {
      const t = tasksStore.tasks.find((x) => x.id === sala.taskId);
      if (t && t.status !== 'done') tasksStore.moveTask(sala.taskId, 1);
    }
    onClose();
  }
</script>

<div class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
  <div
    class="w-full max-w-lg rounded-2xl border border-border bg-card p-5 md:p-6"
    role="dialog"
    aria-modal="true"
    aria-label="Cerrar la sala"
  >
    <h2 class="text-lg font-semibold">¿Lo terminaste?</h2>
    <p class="mt-1 text-sm text-muted-foreground text-pretty">
      El compromiso era «{sala.compromiso}».
    </p>

    <!--
      Tu nota, textual, con los saltos de línea que le pusiste. Va antes que
      las opciones a propósito: primero leés lo que anotaste, después elegís.
      Es texto plano, sin cursiva ni comillas, para que se lea como un
      borrador tuyo y no como algo que la app te está diciendo.
    -->
    {#if nota}
      <div
        class="mt-3 rounded-xl border-l-2 border-ring/40 bg-muted/40 py-2.5 pl-3.5 pr-3"
      >
        <p class="whitespace-pre-wrap text-sm text-muted-foreground text-pretty">
          {nota}
        </p>
      </div>
    {/if}

    <div class="mt-4 flex flex-col gap-2">
      {#each OPCIONES as op (op.valor)}
        <button
          type="button"
          onclick={() => { resultado = op.valor; error = ''; }}
          aria-pressed={resultado === op.valor}
          class="rounded-xl border p-3 text-left transition-colors {
            resultado === op.valor
              ? 'border-ring bg-accent text-accent-foreground'
              : 'border-border hover:border-muted-foreground/40'
          }"
        >
          <span class="block text-sm font-semibold">
            {RESULTADO_LABEL[op.valor]}
          </span>
          <span class="block text-xs opacity-70">{op.ayuda}</span>
        </button>
      {/each}
    </div>

    <!--
      La próxima acción es obligatoria si no terminó. Es el antídoto directo
      al attention residue: retomar mañana no debería exigir re-leer todo para
      reconstruir dónde estabas.
    -->
    {#if falta}
      <label class="mt-4 block">
        <span class="text-xs font-medium text-muted-foreground">
          ¿cuál es la próxima acción? (obligatorio)
        </span>
        <input
          type="text"
          bind:value={proximaAccion}
          placeholder="terminar la parte 3 y mandarlo a revisión"
          class="mt-1.5 w-full rounded-xl border border-border bg-background/60 p-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-ring"
        />
      </label>
    {/if}

    {#if error}
      <p class="mt-3 text-sm text-destructive" role="alert">{error}</p>
    {/if}

    <div class="mt-6 flex justify-end gap-2">
      <button
        type="button"
        onclick={onClose}
        class="min-tap rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground"
      >
        Seguir trabajando
      </button>
      <button
        type="button"
        onclick={confirmar}
        class="min-tap rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Cerrar sala
      </button>
    </div>
  </div>
</div>
