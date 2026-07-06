<script lang="ts">
  let showSettings = $state(false);
  let showStats = $state(false);
</script>

<div class="min-h-screen bg-bg flex flex-col">
  <Navbar onSettings={() => showSettings = true} onStats={() => showStats = true} />

  <main class="flex-1 flex flex-col lg:flex-row overflow-hidden">
    <!-- Timer Panel (Left) -->
    <section class="flex-1 lg:w-[420px] flex flex-col p-4 lg:p-6 overflow-y-auto border-r border-border/30 bg-bg-elevated/50">
      <Timer />
    </section>

    <!-- Kanban Board (Center) -->
    <section class="flex-1 lg:flex-[2] min-w-0 p-4 lg:p-6 overflow-y-auto">
      <KanbanBoard />
    </section>

    <!-- Widgets Panel (Right) -->
    <aside class="hidden lg:flex w-[300px] flex-col p-4 lg:p-6 overflow-y-auto border-l border-border/30 bg-bg-elevated/30 gap-6">
      <WeatherWidget />
      <MusicPlayer />
    </aside>
  </main>

  {#if showSettings}
    <SettingsModal onclose={() => showSettings = false} />
  {/if}

  {#if showStats}
    <StatsModal onclose={() => showStats = false} />
  {/if}
</div>