import { createTasksStore } from './tasks.svelte.ts';
import { createSalaStore } from './sala.svelte.ts';

/**
 * Instancia ÚNICA del store de tareas.
 *
 * Antes cada componente llamaba `createTasksStore()` por su cuenta, lo que
 * creaba estados en memoria divergentes (el ShutdownRitual no veía las tareas
 * del Kanban y viceversa). Todos los componentes deben importar este singleton.
 */
export const tasksStore = createTasksStore();

/** Instancia ÚNICA del store de salas — mismo motivo que arriba. */
export const salaStore = createSalaStore();

export type { Task, Subtask, Energy, DailyNote, ShutdownEntry, StreakData, TasksStore } from './tasks.svelte.ts';
export type { Sala, SalaResultado, Franja } from './sala.svelte.ts';