<script lang="ts">
  import { tasksStore } from '../lib/stores/singleton';
  import { post } from '../lib/api';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  type ChatMsg = { role: 'user' | 'assistant'; content: string };
  type ChatAction = {
    action: string;
    id?: string;
    title?: string;
    text?: string;
    energy?: 'high' | 'medium' | 'low';
    status?: 'todo' | 'doing' | 'done';
    date?: string | null;
  };

  let messages = $state<ChatMsg[]>([]);
  let input = $state('');
  let loading = $state(false);
  let error = $state('');

  let inputEl: HTMLTextAreaElement;

  // Quita bloques JSON (los objetos con "action") del texto del modelo.
  function stripJson(text: string): string {
    return text.replace(/\{\s*"action"[\s\S]*?\}\s*/g, '').replace(/```json\s*[\s\S]*?```/g, '');
  }

  function executeActions(actions: ChatAction[]): string {
    const notes: string[] = [];
    for (const a of actions) {
      try {
        switch (a.action) {
          case 'crear_tarea': {
            const title = (a.title ?? a.text ?? '').trim();
            if (!title) break;
            tasksStore.addTask(title, a.energy ?? 'medium', a.date ?? undefined);
            notes.push(`✅ Creé la tarea: "${title}"`);
            break;
          }
          case 'borrar_tarea': {
            if (a.id) {
              const t = tasksStore.tasks.find((x) => x.id === a.id);
              if (t) {
                tasksStore.removeTask(a.id);
                notes.push(`🗑️ Eliminé: "${t.title}"`);
              }
            }
            break;
          }
          case 'mover_tarea': {
            if (a.id && a.status) {
              const t = tasksStore.tasks.find((x) => x.id === a.id);
              if (t) {
                tasksStore.updateTask(a.id, { status: a.status });
                const labels = { todo: 'Por hacer', doing: 'En proceso', done: 'Hecho' } as const;
                notes.push(`↔️ Moví "${t.title}" a ${labels[a.status]}`);
              }
            }
            break;
          }
        }
      } catch (e) {
        notes.push(`⚠️ No pude ejecutar una acción: ${e instanceof Error ? e.message : e}`);
      }
    }
    return notes.join('\n');
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    input = '';
    error = '';
    messages = [...messages, { role: 'user', content: text }];
    loading = true;
    try {
      const history = messages.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const res = await post<{ answer: string; actions?: ChatAction[] }>('/api/chatbot', {
        message: text,
        history,
        tasks: tasksStore.tasks.map((t) => ({
          ...t,
          text: t.title, // compat con el system prompt viejo
        })),
        pomodoros_today: 0,
        timer_state: null,
        config: null,
        week_stats: null,
      });
      const actionsNote = executeActions(res.actions ?? []);
      // Si se ejecutaron acciones, ocultamos el JSON crudo del modelo y mostramos las notas.
      const cleanAnswer = actionsNote ? stripJson(res.answer).trim() : res.answer;
      const answer = actionsNote && cleanAnswer ? `${cleanAnswer}\n\n${actionsNote}` : actionsNote ? actionsNote : res.answer;
      messages = [...messages, { role: 'assistant', content: answer }];
    } catch (e) {
      error = e instanceof Error ? e.message : 'No se pudo conectar con el asistente';
      messages = [
        ...messages,
        { role: 'assistant', content: 'Ups, no pude responder. ¿Está el backend levantado? 🥲' },
      ];
    } finally {
      loading = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
    if (e.key === 'Escape') onClose();
  }

  const intro =
    '¡Hola! Soy Pomo 🍅 Tu asistente de productividad. Puedo crear tareas, ' +
    'moverlas entre etapas, ayudarte a priorizar y darte consejos para concentrarte.';
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4"
  onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
  role="dialog"
  tabindex="-1"
  aria-modal="true"
  aria-label="Asistente Pomo"
>
  <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

  <div class="relative flex h-[min(640px,85vh)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card animate-scaleIn">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-border px-4 py-3">
      <div class="flex items-center gap-2">
        <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-lg">🍅</span>
        <div>
          <h2 class="text-sm font-semibold leading-tight">Pomo</h2>
          <p class="text-[10px] text-muted-foreground leading-tight">Asistente de productividad IA</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          onclick={() => { messages = []; }}
        >
          Limpiar
        </button>
        <button class="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground" onclick={onClose} aria-label="Cerrar">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>

    <!-- Messages -->
    <div class="flex-1 space-y-3 overflow-y-auto px-4 py-4" role="log" aria-live="polite">
      {#if messages.length === 0}
        <div class="rounded-xl border border-border bg-card/60 p-3">
          <p class="text-sm text-muted-foreground">{intro}</p>
        </div>
      {/if}

      {#each messages as m, i}
        <div class="flex {m.role === 'user' ? 'justify-end' : 'justify-start'}">
          <div
            class="max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm
                   {m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}"
          >
            {m.content}
          </div>
        </div>
      {/each}

      {#if loading}
        <div class="flex justify-start">
          <div class="rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground">Pensando…</div>
        </div>
      {/if}

      {#if error}
        <p class="text-xs text-destructive">{error}</p>
      {/if}
    </div>

    <!-- Input -->
    <div class="border-t border-border p-3">
      <div class="flex items-end gap-2">
        <textarea
          bind:this={inputEl}
          class="max-h-32 flex-1 resize-none rounded-xl border border-border bg-card/60 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          placeholder='Ej: "Creá la tarea: preparar la presentación"'
          rows="1"
          bind:value={input}
          onkeydown={handleKeydown}
          aria-label="Mensaje al asistente"
        ></textarea>
        <button
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform hover:scale-105 disabled:opacity-40"
          onclick={send}
          disabled={loading || !input.trim()}
          aria-label="Enviar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
        </button>
      </div>
    </div>
  </div>
</div>