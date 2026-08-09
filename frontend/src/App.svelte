<script lang="ts">
  import Timer from './components/Timer.svelte';
  import KanbanBoard from './components/KanbanBoard.svelte';
  import MusicPlayer from './components/MusicPlayer.svelte';
  import Navbar from './components/Navbar.svelte';
  import SettingsModal from './components/SettingsModal.svelte';
  import StatsModal from './components/StatsModal.svelte';
  import InstallBanner from './components/InstallBanner.svelte';

  let showSettings = $state(false);
  let showStats = $state(false);
  let showChatbot = $state(false);
</script>

<div class="min-h-screen flex flex-col pb-16">
  <Navbar
    onSettings={() => showSettings = true}
    onStats={() => showStats = true}
    onChatbot={() => showChatbot = !showChatbot}
  />

  <main class="flex-1 flex flex-col lg:flex-row gap-4 p-4 pt-2 max-w-6xl mx-auto w-full overflow-hidden">
    <!-- Timer -->
    <section class="flex-shrink-0 lg:w-[380px] flex items-center justify-center py-4 lg:py-8">
      <Timer />
    </section>

    <!-- Kanban -->
    <section class="flex-1 min-w-0 flex flex-col overflow-hidden min-h-0">
      <KanbanBoard />
    </section>

    <!-- Music (sidebar on desktop, below kanban on mobile) -->
    <aside class="hidden lg:flex w-[260px] flex-col gap-4 pt-4">
      <MusicPlayer />
    </aside>
  </main>

  <!-- Mobile music (always visible at bottom on mobile) -->
  <div class="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-4 pb-[env(safe-area-inset-bottom)]">
    <div class="max-w-lg mx-auto mb-1">
      <MusicPlayer />
    </div>
  </div>

  <InstallBanner />

  {#if showSettings}
    <SettingsModal onclose={() => showSettings = false} />
  {/if}

  {#if showStats}
    <StatsModal onclose={() => showStats = false} />
  {/if}
</div>
