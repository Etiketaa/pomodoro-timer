import { createTasksStore } from './tasks.svelte.ts';

/**
 * Instancia ÚNICA del store de tareas.
 *
 * Antes cada componente llamaba `createTasksStore()` por su cuenta, lo que
 * creaba estados en memoria divergentes (el ShutdownRitual no veía las tareas
 * del Kanban y viceversa). Todos los componentes deben importar este singleton.
 */
export const tasksStore = createTasksStore();

export type { Task, Subtask, Energy, DailyNote, ShutdownEntry, StreakData, TasksStore } from './tasks.svelte.ts';