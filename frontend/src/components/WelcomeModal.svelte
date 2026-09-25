<script lang="ts">
  import {
    saveProfile,
    profile,
    markWelcomeSeen,
    getAreas,
    getGoals,
    getAreaProblems,
    getSuggestedGoalsFor,
    type WorkArea,
    type UserGoals,
    type UserProfile,
  } from '../lib/stores/profile.svelte';

  let { onClose }: { onClose: () => void } = $props();

  const areas = getAreas();
  const goals = getGoals();

  // Estado del wizard (precargado si ya hay perfil guardado)
  let step = $state<1 | 2 | 3>(profile.data ? 2 : 1);
  let workArea = $state<WorkArea>(profile.data?.workArea ?? 'administracion');
  let selectedGoals = $state<UserGoals[]>(
    profile.data?.goals ?? getSuggestedGoalsFor(profile.data?.workArea ?? 'administracion'),
  );
  let needTaskContext = $state(profile.data?.needTaskContext ?? true);
  let organizationProblems = $state(profile.data?.organizationProblems ?? '');
  let extra = $state(profile.data?.extra ?? '');

  const areaProblems = getAreaProblems();

  function pickArea(area: WorkArea) {
    workArea = area;
    // Si el usuario todavía no tocó objetivos, sugerimos los del área nueva.
    if (!profile.data) {
      selectedGoals = getSuggestedGoalsFor(area);
      organizationProblems = '';
    }
    step = 2;
  }

  function toggleGoal(g: UserGoals) {
    selectedGoals = selectedGoals.includes(g)
      ? selectedGoals.filter((x) => x !== g)
      : [...selectedGoals, g];
  }

  function handleSave() {
    saveProfile({
      workArea,
      goals: selectedGoals,
      needTaskContext,
      organizationProblems,
      extra,
    } satisfies UserProfile);
    onClose();
  }

  function handleSkip() {
    markWelcomeSeen();
    onClose();
  }

  const step1Ready = $derived(workArea !== null);
  const step3Ready = $derived(selectedGoals.length > 0 || organizationProblems.trim().length > 0);
</script>

<div
  class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
  role="dialog"
  aria-modal="true"
  aria-labelledby="welcome-title"
>
  <div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scaleIn">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 text-xl shadow-inner">
          🍅
        </div>
        <h2 id="welcome-title" class="mt-3 text-lg font-semibold">
          {step === 1 ? '¿En qué trabajás?' : step === 2 ? 'Contame un poco más' : 'Último paso'}
        </h2>
        <p class="mt-1 text-sm text-muted-foreground">
          {#if step === 1}
            Elegí tu área y armamos tu perfil de trabajo para darte consejos a medida.
          {:else if step === 2}
            Según tu área, te sugerimos estos enfoques. Ajustalos a gusto.
          {:else}
            Confirmá cómo querés que te asista el coach. Después ya podés arrancar. 🚀
          {/if}
        </p>
      </div>
      <span class="rounded-full border border-border bg-card/60 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
        Paso {step} de 3
      </span>
    </div>

    <!-- Paso 1: área de trabajo -->
    {#if step === 1}
      <div class="mt-5 grid grid-cols-2 gap-2">
        {#each areas as area (area.value)}
          <button
            type="button"
            class={"flex items-center gap-2.5 rounded-xl border p-3 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring " +
              (workArea === area.value
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground')}
            onclick={() => pickArea(area.value)}
            aria-pressed={workArea === area.value}
          >
            <span class="text-xl">{area.emoji}</span>
            <span>{area.label}</span>
          </button>
        {/each}
      </div>
      <div class="mt-6 flex items-center justify-between">
        <button
          class="h-10 rounded-lg border border-border bg-card/60 px-4 text-sm transition-colors hover:bg-card/80"
          onclick={handleSkip}
        >
          Ahora no
        </button>
        <button
          class="h-10 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-50"
          onclick={() => step = 2}
          disabled={!step1Ready}
        >
          Siguiente →
        </button>
      </div>
    {/if}

    <!-- Paso 2: objetivos + problema de organización -->
    {#if step === 2}
      <div class="mt-5">
        <fieldset>
          <legend class="text-sm font-medium">¿Qué te gustaría mejorar?</legend>
          <p class="text-xs text-muted-foreground">
            {#each getSuggestedGoalsFor(workArea) as suggested (suggested)}
              <span class="mr-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                sugerido para {workArea}
              </span>
            {/each}
            Elegí una o varias.
          </p>
          <div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {#each goals as g (g.value)}
              {#if workArea && getSuggestedGoalsFor(workArea).includes(g.value)}
                <!-- sugerido -->
                <button
                  type="button"
                  class={"relative flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring " +
                    (selectedGoals.includes(g.value)
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-dashed border-primary/40 bg-primary/5 text-muted-foreground hover:bg-primary/10')}
                  onclick={() => toggleGoal(g.value)}
                  aria-pressed={selectedGoals.includes(g.value)}
                >
                  <span class="text-sm">{g.emoji}</span>
                  <span>{g.label}</span>
                  <span class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground">★</span>
                </button>
              {:else}
                <button
                  type="button"
                  class={"flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring " +
                    (selectedGoals.includes(g.value)
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground')}
                  onclick={() => toggleGoal(g.value)}
                  aria-pressed={selectedGoals.includes(g.value)}
                >
                  <span class="text-sm">{g.emoji}</span>
                  <span>{g.label}</span>
                </button>
              {/if}
            {/each}
          </div>
        </fieldset>

        <div class="mt-5">
          <label for="org-problems" class="block text-sm font-medium">
            ¿Cuál es tu mayor problema al organizar {areaProblems[workArea] ? 'estas tareas' : 'tus tareas'}?
          </label>
          <textarea
            id="org-problems"
            bind:value={organizationProblems}
            rows="2"
            class="mt-2 w-full resize-none rounded-lg border border-border bg-card/60 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            placeholder={areaProblems[workArea] ?? 'Ej: se me acumulan, no sé por dónde arrancar...'}
          ></textarea>
        </div>
      </div>
      <div class="mt-6 flex items-center justify-between">
        <button
          class="h-10 rounded-lg border border-border bg-card/60 px-4 text-sm transition-colors hover:bg-card/80"
          onclick={() => step = 1}
        >
          ← Atrás
        </button>
        <button
          class="h-10 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
          onclick={() => step = 3}
        >
          Siguiente →
        </button>
      </div>
    {/if}

    <!-- Paso 3: contexto de tareas + extra + guardar -->
    {#if step === 3}
      <div class="mt-5">
        <fieldset>
          <legend class="text-sm font-medium">¿Querés que el asistente conozca tus tareas?</legend>
          <div class="mt-2 flex gap-2">
            <button
              type="button"
              class={"flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring " +
                (needTaskContext
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent')}
              onclick={() => needTaskContext = true}
              aria-pressed={needTaskContext}
            >
              ✅ Sí, que las tenga en cuenta
            </button>
            <button
              type="button"
              class={"flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring " +
                (needTaskContext
                  ? 'border-border bg-card text-muted-foreground hover:bg-accent'
                  : 'border-primary bg-primary/15 text-primary')}
              onclick={() => needTaskContext = false}
              aria-pressed={!needTaskContext}
            >
              🙅 No, mejor sin contexto
            </button>
          </div>
        </fieldset>

        <div class="mt-5">
          <label for="org-extra" class="block text-sm font-medium">Algo más que quieras decirle a tu coach (opcional)</label>
          <input
            id="org-extra"
            bind:value={extra}
            type="text"
            class="mt-2 w-full rounded-lg border border-border bg-card/60 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            placeholder="Ej: laburo mejor de noche, odio las reuniones largas..."
          />
        </div>
      </div>
      <div class="mt-6 flex gap-2">
        <button
          class="flex-1 h-10 rounded-lg border border-border bg-card/60 text-sm transition-colors hover:bg-card/80"
          onclick={() => step = 2}
        >
          ← Atrás
        </button>
        <button
          class="flex-1 h-10 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          onclick={handleSave}
          disabled={!step3Ready}
          title={!step3Ready ? 'Elegí al menos un objetivo o contá tu problema' : ''}
        >
          Empezar 🚀
        </button>
      </div>
    {/if}

    <p class="mt-3 text-center text-[10px] text-muted-foreground">
      Todo se guarda solo en tu navegador (localStorage). En cualquier momento lo podés editar desde "Mi perfil".
    </p>
  </div>
</div>