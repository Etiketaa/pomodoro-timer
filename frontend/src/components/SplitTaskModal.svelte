<script lang="ts">
  import { tasksStore, type Energy } from '../lib/stores/singleton';
  import { agentSplit } from '../lib/agent';
  import type { AgentPart } from '../lib/agent';

  interface Props {
    taskId: string;
    onClose: () => void;
    onSplit: (parts: string[]) => void;
  }

  let { taskId, onClose, onSplit }: Props = $props();

  let parts = $state<{ id: string; text: string }[]>(['', '', ''].map(() => ({ id: crypto.randomUUID(), text: '' })));
  let focusIndex = $state(0);
  let aiLoading = $state(false);
  let aiError = $state('');

  const task = $derived(tasksStore.tasks.find((t) => t.id === taskId));

  function addPart() {
    parts = [...parts, { id: crypto.randomUUID(), text: '' }];
    focusIndex = parts.length - 1;
  }

  function removePart(index: number) {
    if (parts.length <= 1) return;
    parts = parts.filter((_, i) => i !== index);
    focusIndex = Math.min(focusIndex, parts.length - 1);
  }

  function handleSubmit() {
    const validParts = parts.map(p => p.text.trim()).filter(p => p);
    if (validParts.length === 0) return;
    onSplit(validParts);
  }

  function handleKeydown(e: KeyboardEvent, index: number) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (index === parts.length - 1) {
        addPart();
      } else {
        focusIndex = index + 1;
      }
    }
    if (e.key === 'Escape') {
      onClose();
    }
  }

  async function splitWithAI() {
    if (!task || aiLoading) return;
    aiLoading = true;
    aiError = '';
    try {
      const res = await agentSplit(task.title, task.energy ?? 'medium');
      const agentParts: AgentPart[] = res.parts;
      parts = agentParts.map((p) => ({ id: crypto.randomUUID(), text: p.title }));
      focusIndex = 0;
    } catch (e) {
      aiError = e instanceof Error ? e.message : 'No se pudo dividir con IA';
    } finally {
      aiLoading = false;
    }
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onclick={onClose}>
  <div 
    class="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scaleIn"
    onclick={(e) => e.stopPropagation()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="split-title"
  >
    <div class="flex items-center justify-between mb-4">
      <h2 id="split-title" class="text-lg font-semibold">Dividir tarea en micro-tareas</h2>
      <button
        class="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
        onclick={onClose}
        aria-label="Cerrar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <p class="text-sm text-muted-foreground mb-4">
      Partí la tarea en pasos de <strong>~10 min c/u</strong>. Una por línea, Enter para agregar más.
    </p>

    {#if task}
      <button
        class="w-full h-11 mb-4 rounded-lg border border-primary/40 bg-primary/10 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
        onclick={splitWithAI}
        disabled={aiLoading}
        title={`Dividir con IA: "${task.title}"`}
      >
        {aiLoading ? '✨ Pensando…' : '✨ Dividir con IA'}
      </button>
      {#if aiError}
        <p class="text-xs text-destructive mb-3">{aiError}</p>
      {/if}
    {/if}

    <div class="flex flex-col gap-2 mb-4" role="list" aria-label="Partes de la tarea">
      {#each parts as part, index (part.id)}
        <div class="flex items-center gap-2" role="listitem">
          <span class="shrink-0 text-xs text-muted-foreground w-6 text-center">{index + 1}.</span>
          <input
            class="flex-1 h-10 rounded-lg border border-border bg-card/60 px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            type="text"
            placeholder="Ej: Buscar docs de la API"
            bind:value={part.text}
            onkeydown={(e) => handleKeydown(e, index)}
            aria-label={`Parte ${index + 1}`}
          />
          {#if parts.length > 1}
            <button
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-destructive hover:bg-red-500/10"
              onclick={() => removePart(index)}
              aria-label={`Eliminar parte ${index + 1}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          {/if}
        </div>
      {/each}
    </div>

    <button
      class="w-full h-10 rounded-lg bg-primary text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      onclick={addPart}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Agregar otra parte
    </button>

    <div class="flex gap-2 mt-4">
      <button
        class="flex-1 h-10 rounded-lg border border-border bg-card/60 text-sm transition-colors hover:bg-card/80"
        onclick={onClose}
      >
        Cancelar
      </button>
      <button
        class="flex-1 h-10 rounded-lg bg-primary text-primary-foreground transition-colors hover:opacity-90"
        onclick={handleSubmit}
      >
        Crear {parts.filter(p => p.text.trim()).length} micro-tarea{parts.filter(p => p.text.trim()).length !== 1 ? 's' : ''}
      </button>
    </div>

    <p class="text-[10px] text-muted-foreground text-center mt-3">
      Cada parte se crea como subtarea de ~10 min. Las podés marcar completas individualmente.
    </p>
  </div>
</div>