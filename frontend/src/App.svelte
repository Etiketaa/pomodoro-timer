<script lang="ts">
  import MusicPlayer from './components/MusicPlayer.svelte';
  import Navbar from './components/Navbar.svelte';
  import SettingsModal from './components/SettingsModal.svelte';
  import StatsModal from './components/StatsModal.svelte';
  import InstallBanner from './components/InstallBanner.svelte';
  import AgentChat from './components/AgentChat.svelte';
  import WelcomeModal from './components/WelcomeModal.svelte';

  import SalaAbrir from './components/SalaAbrir.svelte';
  import SalaActiva from './components/SalaActiva.svelte';
  import SalaHistorial from './components/SalaHistorial.svelte';

  import { profile, welcomeSeen } from './lib/stores/profile.svelte';
  import { salaStore } from './lib/stores/singleton';

  let showSettings = $state(false);
  let showStats = $state(false);
  let showChatbot = $state(false);
  let showWelcome = $state(false);

  // Paso previo al uso: si no hay perfil y nunca se mostró la bienvenida, abrirla.
  $effect(() => {
    if (!profile.data && !welcomeSeen.value && !showWelcome) {
      showWelcome = true;
    }
  });
</script>

<div class="min-h-screen bg-background text-foreground">
  <Navbar
    onSettings={() => showSettings = true}
    onStats={() => showStats = true}
    onChatbot={() => showChatbot = !showChatbot}
    onProfile={() => showWelcome = true}
  />

  <main class="mx-auto w-full max-w-3xl px-4 pb-40 pt-6 md:pb-28">
    <!--
      La sala abierta manda: si estás adentro, no hay nada más en pantalla.
      El Kanban, el calendario y el reloj grande salieron de la primera
      vista a propósito — la tesis dice que el pomodoro es mecánica interna,
      no protagonista, y que la sala es la unidad, no la tarea suelta.
    -->
    {#if salaStore.activa}
      <SalaActiva sala={salaStore.activa} />
    {:else}
      <div class="flex flex-col gap-6">
        <SalaAbrir />
        <SalaHistorial />
      </div>
    {/if}

    <!-- El ambiente viaja con vos: sale de la lista y queda abajo. -->
    <div class="mt-8">
      <MusicPlayer />
    </div>
  </main>

  <InstallBanner />

  {#if showSettings}
    <SettingsModal onclose={() => showSettings = false} />
  {/if}

  {#if showStats}
    <StatsModal onclose={() => showStats = false} />
  {/if}

  {#if showChatbot}
    <AgentChat onClose={() => showChatbot = false} />
  {/if}

  {#if showWelcome}
    <WelcomeModal onClose={() => showWelcome = false} />
  {/if}
</div>
