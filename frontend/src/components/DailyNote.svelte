<script lang="ts">
  import type { DailyNote } from '../lib/stores/tasks.svelte.ts';

  interface Props {
    note: DailyNote;
    onUpdate: (content: string) => void;
  }

  let { note, onUpdate }: Props = $props();

  let isEditing = $state(false);
  let draft = $state(note.content);
  let showPreview = $state(false);

  function save() {
    onUpdate(draft);
    isEditing = false;
    showPreview = false;
  }

  function cancel() {
    draft = note.content;
    isEditing = false;
    showPreview = false;
  }

  function togglePreview() {
    showPreview = !showPreview;
  }

  // Simple markdown parser for preview (no external dep)
  // Primero escapamos HTML para evitar inyección, luego aplicamos markdown.
  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function markedParse(md: string): string {
    if (!md) return '';
    return escapeHtml(md)
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>')
      .replace(/\n/g, '<br>');
  }
</script>

<div class="rounded-2xl border border-border bg-card/40 p-3">
  <div class="flex items-center justify-between mb-2">
    <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="M15 5l4 4"/>
      </svg>
      Brain Dump — {new Date(note.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
    </h3>
    <div class="flex items-center gap-1">
      <button
        class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
        onclick={togglePreview}
        aria-label={showPreview ? 'Editar' : 'Vista previa'}
        title={showPreview ? 'Editar' : 'Vista previa (Markdown)'}
      >
        {#if showPreview}
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="M15 5l4 4"/></svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
        {/if}
      </button>
      <button
        class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
        onclick={() => isEditing = !isEditing}
        aria-label={isEditing ? 'Cancelar' : 'Editar'}
      >
        {#if isEditing}
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="M15 5l4 4"/></svg>
        {/if}
      </button>
    </div>
  </div>

  {#if isEditing}
    <textarea
      class="w-full min-h-[100px] rounded-lg border border-border bg-card/60 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring resize-y font-mono"
      placeholder="Tirá acá todo lo que tengas en la cabeza... tareas, ideas, preocupaciones, recordatorios. Sin orden, sin presión."
      bind:value={draft}
      onkeydown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save(); }}
      aria-label="Nota del día"
    ></textarea>
    <div class="flex items-center justify-end gap-2 mt-2">
      <button class="text-xs text-muted-foreground hover:text-foreground" onclick={cancel}>Cancelar</button>
      <button class="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90" onclick={save}>Guardar (Ctrl+Enter)</button>
    </div>
    <p class="text-[10px] text-muted-foreground mt-1">Tip: usá Markdown básico. Ctrl+Enter para guardar.</p>
  {:else if showPreview}
    <div class="prose prose-sm max-w-none text-sm">{@html markedParse(note.content)}</div>
  {:else}
    <div class="min-h-[60px] text-sm text-foreground/80 whitespace-pre-wrap font-sans">
      {#if note.content}
        {note.content}
      {:else}
        <span class="text-muted-foreground/50 italic">Vacío — click en el lápiz para volcar tu mente acá</span>
      {/if}
    </div>
  {/if}
</div>