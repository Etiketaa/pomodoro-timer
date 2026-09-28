<script lang="ts">
  /**
   * Perfil. Antes de esto, el tab "Perfil" de mobile y el item "Mi perfil"
   * del header de desktop abrian el wizard de bienvenida, y con eso
   * SettingsModal, StatsModal y AgentChat se quedaban sin ninguna puerta en
   * mobile: el Navbar es el único que los abria y no se renderiza bajo 1024px.
   *
   * Acá viven las cuatro cosas. No es una pantalla nueva con contenido nuevo:
   * es la puerta que faltaba.
   */
  import { areaLabel, getGoals, profile, type UserGoals } from '../lib/stores/profile.svelte';

  let {
    onEditarPerfil = () => {},
    onStats = () => {},
    onSettings = () => {},
    onChatbot = () => {},
  }: {
    onEditarPerfil: () => void;
    onStats: () => void;
    onSettings: () => void;
    onChatbot: () => void;
  } = $props();

  const etiquetaGoal = (g: UserGoals) => getGoals().find((x) => x.value === g)?.label ?? g;

  // Los onclick van en closures a proposito: referenciar los props directo
  // los congelaria al primer render y Svelte avisa. Con la flecha se leen
  // cuando se tocan.
  const ENTRADAS = [
    { id: 'perfil', titulo: 'Editar tu perfil', detalle: 'Área, objetivos y contexto', onclick: () => onEditarPerfil() },
    { id: 'constancia', titulo: 'Estadísticas', detalle: 'Cuánto rendiste y cuándo', onclick: () => onStats() },
    { id: 'ajustes', titulo: 'Ajustes del temporizador', detalle: 'Duración de foco y descansos', onclick: () => onSettings() },
    { id: 'asistente', titulo: 'Asistente', detalle: 'Preguntarle algo sobre tu trabajo', onclick: () => onChatbot() },
  ] as const;

  const ICONO = {
    perfil: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    constancia: 'M3 3v18h18M8 16V11M13 16V7M18 16v-3',
    ajustes: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    asistente: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z',
  } as const;
</script>

<div class="space-y-5">
  <h1 class="text-xl font-semibold">Perfil</h1>

  <!--
    Resumen de lo que ya elegiste. Si no hay perfil, el wizard sigue siendo
    la primera pantalla: por eso la fila de arriba dice "Armar tu perfil" y no
    "Editar tu perfil" cuando no existe.
  -->
  <section class="rounded-2xl border border-border bg-card/60 p-4">
    {#if profile.data}
      <p class="text-sm text-muted-foreground">Trabajás en</p>
      <p class="text-base font-medium">{areaLabel(profile.data.workArea)}</p>

      {#if profile.data.goals.length}
        <p class="mt-3 text-sm text-muted-foreground">Querés</p>
        <ul class="mt-1 flex flex-wrap gap-1.5">
          {#each profile.data.goals as g (g)}
            <li
              class="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
            >
              {etiquetaGoal(g)}
            </li>
          {/each}
        </ul>
      {/if}

      <p class="mt-3 text-xs text-muted-foreground">
        Se guarda solo en este navegador. No hay cuenta ni servidor.
      </p>
    {:else}
      <p class="text-sm text-muted-foreground">
        Todavía no armaste tu perfil. Sirve para que el asistente sepa de qué
        área estás trabajando. Son treinta segundos.
      </p>
    {/if}
  </section>

  <nav class="overflow-hidden rounded-2xl border border-border" aria-label="Perfil">
    {#each ENTRADAS as e (e.id)}
      <button
        type="button"
        onclick={e.onclick}
        class="flex min-tap w-full items-center gap-3 border-b border-border px-4 text-left transition-colors last:border-b-0 hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="shrink-0 text-muted-foreground"
        >
          <path d={ICONO[e.id]} />
        </svg>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-medium">
            {e.id === 'perfil' && !profile.data ? 'Armar tu perfil' : e.titulo}
          </span>
          <span class="block text-xs text-muted-foreground">{e.detalle}</span>
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="shrink-0 text-muted-foreground"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    {/each}
  </nav>
</div>
