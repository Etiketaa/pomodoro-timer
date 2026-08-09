<script lang="ts">
  import Timer from './components/Timer.svelte';
  import KanbanBoard from './components/KanbanBoard.svelte';
  import MusicPlayer from './components/MusicPlayer.svelte';
  import Navbar from './components/Navbar.svelte';
  import SettingsModal from './components/SettingsModal.svelte';
  import StatsModal from './components/StatsModal.svelte';
  import InstallBanner from './components/InstallBanner.svelte';
  import Calendar from './components/Calendar.svelte';

  let showSettings = $state(false);
  let showStats = $state(false);
  let showChatbot = $state(false);
</script>

<div class="min-h-screen bg-background text-foreground">
  <Navbar
    onSettings={() => showSettings = true}
    onStats={() => showStats = true}
    onChatbot={() => showChatbot = !showChatbot}
  />

  <main class="mx-auto w-full max-w-6xl px-4 pb-40 pt-6 md:pb-28">
    <div class="grid gap-8 lg:grid-cols-[minmax(0,380px)_1fr] lg:gap-10">
      <!-- Focus column -->
      <div class="flex flex-col gap-5 lg:sticky lg:top-20 lg:self-start">
        <Timer />
        <MusicPlayer />
      </div>

      <!-- Tasks column -->
      <div class="flex flex-col gap-4">
        <div>
          <h1 class="text-lg font-semibold text-balance">
            Tu sesión de trabajo
          </h1>
          <p class="text-sm text-muted-foreground text-pretty">
            Organizá tus tareas mientras el temporizador corre. Arrastrá
            cada tarea entre etapas con las flechas.
          </p>
        </div>
        <KanbanBoard />
        <Calendar />
      </div>
    </div>
  </main>

  <InstallBanner />

  {#if showSettings}
    <SettingsModal onclose={() => showSettings = false} />
  {/if}

  {#if showStats}
    <StatsModal onclose={() => showStats = false} />
  {/if}
</div>
