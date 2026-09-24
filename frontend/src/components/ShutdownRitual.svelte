<script lang="ts">
  import { tasksStore, type Energy } from '../lib/stores/singleton';
  import { agentRitual } from '../lib/agent';
  import type { RitualReflection } from '../lib/agent';

  interface Props {
    onClose: () => void;
    completedToday: number;
  }

  let { onClose, completedToday }: Props = $props();

  let step = $state(0); // 0: intro, 1: review, 2: reflect, 3: plan, 4: done, 5: coach
  let whatWentWell = $state('');
  let whatWasHard = $state('');
  let tomorrowFocus = $state('');
  let mood = $state<Energy>('medium');

  // Coach (paso 5)
  let coachLoading = $state(false);
  let coachError = $state('');
  let coach = $state<RitualReflection | null>(null);

  const steps = [
    { title: 'Repaso', desc: '¿Qué completaste hoy?' },
    { title: 'Reflexión', desc: '¿Qué fue bien? ¿Qué costó?' },
    { title: 'Mañana', desc: '¿Una cosa importante para mañana?' },
    { title: 'Cierre', desc: 'Confirmar y apagar' },
  ];

  function nextStep() {
    // pasos 4 (confirmación) y 5 (coach) no tienen título en el progress,
    // así que el límite es steps.length (no steps.length - 1)
    if (step < steps.length) step++;
  }

  function prevStep() {
    if (step > 0) step--;
  }

  async function finish() {
    // Guardar el ritual siempre, aunque falle el coach
    tasksStore.saveShutdownEntry({
      completedCount: completedToday,
      whatWentWell,
      whatWasHard,
      tomorrowFocus,
      mood,
    });
    step = 5; // paso 5: coach reflection (el 4 es la confirmación previa)

    // Generar la reflexión del coach (no bloquea el cierre)
    coachLoading = true;
    coachError = '';
    coach = null;
    try {
      coach = await agentRitual({
        wentWell: whatWentWell,
        wasHard: whatWasHard,
        tomorrowFocus,
        mood,
        completedCount: completedToday,
        streak: tasksStore.streak.currentStreak,
      });
    } catch (e) {
      coachError = e instanceof Error ? e.message : 'No se pudo generar la reflexión';
    } finally {
      coachLoading = false;
    }
  }

  function closeAll() {
    step = 0;
    whatWentWell = '';
    whatWasHard = '';
    tomorrowFocus = '';
    mood = 'medium';
    coach = null;
    coachError = '';
    onClose();
  }

  const completedTasks = tasksStore.tasks.filter(t => 
    t.status === 'done' && 
    t.completedAt?.startsWith(new Date().toISOString().slice(0, 10)) &&
    !t.parentId
  );
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onclick={closeAll}>
  <div 
    class="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scaleIn max-h-[90vh] overflow-y-auto"
    onclick={(e) => e.stopPropagation()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="shutdown-title"
  >
    <!-- Progress indicator -->
    <div class="flex items-center justify-between mb-6" role="progressbar" aria-valuenow={Math.min(step + 1, steps.length)} aria-valuemin={1} aria-valuemax={steps.length} aria-label="Progreso del ritual de cierre">
      {#each steps as s, i}
        <div class="flex flex-col items-center gap-1 flex-1 relative">
          <div class="flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all
                        {i < step ? 'bg-primary border-primary text-primary-foreground' : i === step ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground'}"
               aria-current={i === step ? 'step' : undefined}>
            {#if i < step}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            {:else}
              <span class="text-sm font-semibold">{i + 1}</span>
            {/if}
          </div>
          <span class="text-[10px] text-center text-muted-foreground mt-1">{s.title}</span>
          {#if i < steps.length - 1}
            <div class="absolute top-4 left-1/2 w-full h-0.5 bg-border -z-10" aria-hidden="true"></div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Step 0: Intro / Review completed -->
    {#if step === 0}
      <div class="text-center">
        <div class="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-primary/10 text-primary mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
        </div>
        <h2 id="shutdown-title" class="text-xl font-semibold mb-2">Cerrar el día</h2>
        <p class="text-muted-foreground mb-6">
          Tomate 2 minutos para procesar el día. Sin presión, solo consciencia.
        </p>
        
        {#if completedTasks.length > 0}
          <div class="text-left mb-6 p-4 rounded-xl bg-card/60 border border-border">
            <h3 class="text-sm font-semibold mb-3 flex items-center gap-2">
              <span class="h-2 w-2 rounded-full bg-green-500"></span>
              Completaste {completedTasks.length} tarea{completedTasks.length !== 1 ? 's' : ''} hoy:
            </h3>
            <ul class="space-y-1 text-sm">
              {#each completedTasks as t}
                <li class="flex items-center gap-2 text-foreground/80">
                  <span class="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0"></span>
                  <span class="truncate">{t.title}</span>
                </li>
              {/each}
            </ul>
          </div>
        {:else}
          <div class="text-center p-4 rounded-xl bg-muted/30 border border-dashed border-border">
            <p class="text-sm text-muted-foreground">No completaste tareas hoy. Y está bien. El ritual igual vale.</p>
          </div>
        {/if}

        <button
          class="w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-medium transition-colors hover:opacity-90"
          onclick={nextStep}
        >
          Empezar ritual →
        </button>
      </div>
    {/if}

    <!-- Step 1: What went well -->
    {#if step === 1}
      <div>
        <h3 class="text-lg font-semibold mb-1">¿Qué salió bien hoy?</h3>
        <p class="text-sm text-muted-foreground mb-4">Aunque sea pequeño. Un win es un win.</p>
        <textarea
          class="w-full min-h-[80px] rounded-lg border border-border bg-card/60 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring resize-y"
          placeholder="Ej: Avancé en el PR difícil / Hice 3 pomodoros seguidos / Me levanté a tiempo / Respondí ese email que postergaba"
          bind:value={whatWentWell}
          aria-label="Qué salió bien"
        ></textarea>
        <div class="flex justify-end gap-2 mt-4">
          <button class="px-4 py-2 text-sm" onclick={prevStep}>← Volver</button>
          <button class="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg" onclick={nextStep}>Siguiente →</button>
        </div>
      </div>
    {/if}

    <!-- Step 2: What was hard -->
    {#if step === 2}
      <div>
        <h3 class="text-lg font-semibold mb-1">¿Qué te costó? ¿Qué drenó energía?</h3>
        <p class="text-sm text-muted-foreground mb-4">Sin culpa. Solo datos para mañana.</p>
        <textarea
          class="w-full min-h-[80px] rounded-lg border border-border bg-card/60 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring resize-y"
          placeholder="Ej: Me distraje con el celular / La tarea X era muy grande y no sabía por dónde / Me sentí bajoneado a media tarde / Reuniones infinitas"
          bind:value={whatWasHard}
          aria-label="Qué costó"
        ></textarea>
        <div class="flex justify-end gap-2 mt-4">
          <button class="px-4 py-2 text-sm" onclick={prevStep}>← Volver</button>
          <button class="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg" onclick={nextStep}>Siguiente →</button>
        </div>
      </div>
    {/if}

    <!-- Step 3: Tomorrow focus + mood -->
    {#if step === 3}
      <div>
        <h3 class="text-lg font-semibold mb-1">Una cosa importante para mañana</h3>
        <p class="text-sm text-muted-foreground mb-4">Solo UNA. La que si hacés, el día ya valió la pena.</p>
        <input
          class="w-full h-11 rounded-lg border border-border bg-card/60 px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          type="text"
          placeholder="Ej: Terminar el login / Llamar a cliente / Escribir 200 palabras / Revisar PR #42"
          bind:value={tomorrowFocus}
          aria-label="Foco de mañana"
        />
        
        <div class="mt-6">
          <label class="text-sm font-medium mb-2 block">¿Cómo terminás el día?</label>
          <div class="flex gap-3" role="radiogroup" aria-label="Estado de ánimo">
            {#each ['high', 'medium', 'low'] as m}
              <label class="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors cursor-pointer
                            {mood === m ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/30'}">
                <input
                  type="radio"
                  name="mood"
                  value={m}
                  class="sr-only"
                  checked={mood === m}
                  onchange={() => mood = m as Energy}
                />
                <span class="text-2xl">
                  {m === 'high' ? '😄' : m === 'medium' ? '😐' : '😴'}
                </span>
                <span class="text-xs font-medium capitalize">{m === 'high' ? 'Bien' : m === 'medium' ? 'Regular' : 'Bajo'}</span>
              </label>
            {/each}
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-4">
          <button class="px-4 py-2 text-sm" onclick={prevStep}>← Volver</button>
          <button class="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg" onclick={nextStep}>Siguiente →</button>
        </div>
      </div>
    {/if}

    <!-- Step 4: Confirmation -->
    {#if step === 4}
      <div class="text-center">
        <div class="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-green-500/10 text-green-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h3 class="text-lg font-semibold mb-2">¡Listo!</h3>
        <p class="text-sm text-muted-foreground mb-6">
          Día cerrado. Mañana arrancás con foco en: <strong>{tomorrowFocus || '(definilo mañana)'}</strong>
        </p>
        
        <div class="rounded-xl bg-card/60 border border-border p-4 text-left mb-6 text-sm">
          <p><strong>Racha actual:</strong> {tasksStore.streak.currentStreak} día{tasksStore.streak.currentStreak !== 1 ? 's' : ''}</p>
          <p><strong>Completadas hoy:</strong> {completedToday}</p>
          <p><strong>Energía final:</strong> {mood === 'high' ? '😄' : mood === 'medium' ? '😐' : '😴'} {mood}</p>
        </div>

        <button
          class="w-full h-12 rounded-xl bg-green-500 text-white text-sm font-medium transition-colors hover:opacity-90"
          onclick={finish}
          disabled={coachLoading}
        >
          {coachLoading ? '✨ Pidiendo reflexión al coach…' : 'Cerrar día y ver reflexión ✨'}
        </button>
      </div>
    {/if}

    <!-- Step 5: Coach reflection -->
    {#if step === 5}
      <div class="text-center">
        <div class="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-primary/10 text-primary mb-4">
          <span class="text-3xl">🧠</span>
        </div>
        <h3 class="text-lg font-semibold mb-2">Tu coach dice:</h3>

        {#if coachLoading}
          <p class="text-sm text-muted-foreground py-4">Pensando sobre tu día…</p>
        {:else if coach}
          <div class="rounded-xl bg-card/60 border border-border p-4 text-left mb-4 text-sm space-y-3 animate-scaleIn">
            <p class="text-foreground/90 whitespace-pre-line">{coach.reflection}</p>
            {#if coach.tip}
              <div class="rounded-lg bg-primary/10 border border-primary/20 p-3">
                <p class="text-xs font-semibold text-primary mb-1">💡 Para mañana</p>
                <p class="text-sm text-foreground/85">{coach.tip}</p>
              </div>
            {/if}
          </div>
        {:else}
          <div class="rounded-xl border border-dashed border-border p-4 mb-4">
            <p class="text-sm text-muted-foreground">No pude generar la reflexión ahora. El ritual quedó guardado igual.</p>
            {#if coachError}
              <p class="text-xs text-destructive mt-2">{coachError}</p>
            {/if}
          </div>
        {/if}

        <button
          class="w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50"
          onclick={closeAll}
          disabled={coachLoading}
        >
          Terminar
        </button>
      </div>
    {/if}
  </div>
</div>