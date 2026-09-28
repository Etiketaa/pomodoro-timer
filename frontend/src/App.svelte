<script lang="ts">
  import Navbar from './components/Navbar.svelte';
  import TabBar from './components/TabBar.svelte';
  import MusicPlayer from './components/MusicPlayer.svelte';
  import SettingsModal from './components/SettingsModal.svelte';
  import StatsModal from './components/StatsModal.svelte';
  import InstallBanner from './components/InstallBanner.svelte';
  import AgentChat from './components/AgentChat.svelte';
  import WelcomeModal from './components/WelcomeModal.svelte';

  import SalaAbrir from './components/SalaAbrir.svelte';
  import SalaActiva from './components/SalaActiva.svelte';
  import SalaHistorial from './components/SalaHistorial.svelte';
  import Perfil from './components/Perfil.svelte';

  import { profile, welcomeSeen } from './lib/stores/profile.svelte';
  import { salaStore } from './lib/stores/singleton';

  let showSettings = $state(false);
  let showStats = $state(false);
  let showChatbot = $state(false);
  let showWelcome = $state(false);

  /**
   * Dos pestañas y ya está: Sala y Constancia. En móvil la navegación
   * primaria va abajo (ver TabBar); en desktop las dos conviven en la misma
   * columna porque hay ancho de sobra y forzar un tab bar en una pantalla
   * grande solo agrega un toque.
   */
  let tab = $state<'sala' | 'constancia' | 'perfil'>('sala');

  /**
   * Los atajos del manifest llegan como query params. Sin esto, el long-press
   * del ícono instalado abre la app en un estado arbitrario y el atajo es
   * adorno — que es exactamente lo que estava mal con los atajos de pomodoro
   * que sacamos.
   */
  $effect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'constancia') tab = 'constancia';
    if (params.get('abrir')) {
      tab = 'sala';
      // El foco directo al campo de compromiso: el atajo se llama "Abrir
      // sala" y abrir la pantalla no es abrir la sala.
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLTextAreaElement>('textarea[aria-label="Frase de compromiso"]')
          ?.focus();
      });
    }
  });

  // Si cerrás una sala quedás en la pestaña de Sala, que es donde empieza el
  // loop. Quedarte en Constancia después de cerrar se siente como castigo.
  $effect(() => {
    if (salaStore.activa) tab = 'sala';
  });

  // Paso previo al uso: si no hay perfil y nunca se mostró la bienvenida, abrirla.
  $effect(() => {
    if (!profile.data && !welcomeSeen.value && !showWelcome) {
      showWelcome = true;
    }
  });
</script>

<div class="min-h-screen bg-background text-foreground">
  <!-- El header con hamburguesa solo tiene sentido en desktop. En móvil lo
       reemplaza el TabBar, que está donde el pulgar llega. -->
  <div class="hidden lg:block">
    <Navbar
      {tab}
      onChange={(t) => (tab = t)}
      haySalaAbierta={!!salaStore.activa}
    />
  </div>

  <!-- px-safe: en landscape el notch muerde los laterales. -->
  <main
    class="mx-auto w-full max-w-2xl px-safe pt-6 lg:max-w-3xl {salaStore.activa
      ? 'pb-cta'
      : 'pb-tabbar'}"
  >
    <!--
      Con una sala abierta no hay nada más en pantalla. Es la regla de la
      tesis: si estás adentro, no hay nada más en pantalla.
    -->
    {#if salaStore.activa}
      <SalaActiva sala={salaStore.activa} />
    {:else if tab === 'perfil'}
      <Perfil
        onEditarPerfil={() => showWelcome = true}
        onStats={() => showStats = true}
        onSettings={() => showSettings = true}
        onChatbot={() => showChatbot = true}
      />
    {:else if tab === 'sala'}
      <SalaAbrir nivelEncabezado={1} />
    {:else}
      <SalaHistorial nivelEncabezado={1} />
    {/if}

    <!-- En desktop las dos secciones conviven: no hay pulgar que sufra. -->
    {#if !salaStore.activa && tab !== 'perfil'}
      <div class="mt-6 hidden lg:block">
        {#if tab === 'sala'}
          <SalaHistorial nivelEncabezado={2} />
        {:else}
          <SalaAbrir nivelEncabezado={2} />
        {/if}
      </div>
    {/if}

    <!-- El ambiente viaja con vos. En móvil va arriba de la barra de
         pestañas, nunca debajo del gesto de "ir a inicio". -->
    <div class="mt-8">
      <MusicPlayer />
    </div>
  </main>

  <InstallBanner />

  <TabBar
    {tab}
    onChange={(t) => (tab = t)}
    haySalaAbierta={!!salaStore.activa}
  />

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
