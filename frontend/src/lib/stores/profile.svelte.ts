/**
 * Perfil del usuario: área de trabajo, qué quiere mejorar, si quiere contexto
 * de sus tareas y sus problemas de organización. Vive en localStorage
 * (`pomodoroProfile`) y se envía a los features agénticos para personalizar
 * las respuestas.
 *
 * Archivo .svelte.ts para usar runes ($state) y exponer reactividad al UI.
 */

export type WorkArea = 'administracion' | 'ventas' | 'logistica' | 'tecnico' | 'creativo' | 'otro';

export type UserGoals =
  | 'enfoque'
  | 'organizacion'
  | 'procrastinacion'
  | 'energia'
  | 'velocidad'
  | 'equilibrio';

export type UserProfile = {
  workArea: WorkArea;
  goals: UserGoals[];
  needTaskContext: boolean;
  organizationProblems: string;
  extra: string;
  updatedAt?: string;
};

const PROFILE_KEY = 'pomodoroProfile';
const WELCOME_SEEN_KEY = 'pomodoroWelcomeSeen';

const AREAS: { value: WorkArea; label: string; emoji: string; short: string }[] = [
  { value: 'administracion', label: 'Administración', emoji: '📊', short: 'admin' },
  { value: 'ventas', label: 'Ventas / atención', emoji: '🤝', short: 'ventas' },
  { value: 'logistica', label: 'Logística / operaciones', emoji: '🚚', short: 'logística' },
  { value: 'tecnico', label: 'Técnico / desarrollo', emoji: '🛠️', short: 'técnico' },
  { value: 'creativo', label: 'Creativo / diseño', emoji: '🎨', short: 'creativo' },
  { value: 'otro', label: 'Otro', emoji: '📁', short: 'otro' },
];

const GOALS: { value: UserGoals; label: string; emoji: string }[] = [
  { value: 'enfoque', label: 'Enfocarme más', emoji: '🎯' },
  { value: 'organizacion', label: 'Organizar mi día', emoji: '🗂️' },
  { value: 'procrastinacion', label: 'Dejar de postergar', emoji: '⏰' },
  { value: 'energia', label: 'Manejar mi energía', emoji: '🔋' },
  { value: 'velocidad', label: 'Ser más rápido', emoji: '⚡' },
  { value: 'equilibrio', label: 'Equilibrar trabajo/descanso', emoji: '⚖️' },
];

/** Problemas de organización típicos por área (placeholder + sugerencia). */
const AREA_PROBLEMS: Record<WorkArea, string> = {
  administracion: 'Ej: se me acumulan los pendientes administrativos, pierdo horas en mails y planillas...',
  ventas: 'Ej: no les doy seguimiento a los clientes, se me escapan cierres y cotizaciones...',
  logistica: 'Ej: se me atrasan los despachos, no priorizo las entregas urgentes...',
  tecnico: 'Ej: arranco mil cosas a la vez, bugs y tickets que quedan colgados...',
  creativo: 'Ej: me quedo con bloqueo creativo, no separo tiempo para crear...',
  otro: 'Ej: se me acumulan las tareas y no sé por dónde arrancar...',
};

/** Objetivos sugeridos por defecto según el área elegida. */
const AREA_SUGGESTED_GOALS: Record<WorkArea, UserGoals[]> = {
  administracion: ['organizacion', 'enfoque'],
  ventas: ['organizacion', 'velocidad'],
  logistica: ['organizacion', 'energia'],
  tecnico: ['enfoque', 'procrastinacion'],
  creativo: ['enfoque', 'equilibrio'],
  otro: ['enfoque', 'organizacion'],
};

export function getAreas() {
  return AREAS;
}

export function getGoals() {
  return GOALS;
}

export function getAreaProblems() {
  return AREA_PROBLEMS;
}

export function getSuggestedGoalsFor(area: WorkArea): UserGoals[] {
  return AREA_SUGGESTED_GOALS[area] ?? [];
}

export function areaLabel(area: WorkArea | undefined): string {
  if (!area) return '';
  return AREAS.find((a) => a.value === area)?.label ?? area;
}

function loadProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      workArea: AREAS.some((a) => a.value === parsed.workArea) ? parsed.workArea : 'otro',
      goals: GOALS.filter((g) => (parsed.goals ?? []).includes(g.value)).map((g) => g.value),
      needTaskContext: !!parsed.needTaskContext,
      organizationProblems: typeof parsed.organizationProblems === 'string' ? parsed.organizationProblems : '',
      extra: typeof parsed.extra === 'string' ? parsed.extra : '',
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export const profile = $state<{ data: UserProfile | null }>({
  data: loadProfile(),
});

/** ¿Ya se mostró la bienvenida alguna vez? (localStorage) */
export const welcomeSeen = $state({ value: localStorage.getItem(WELCOME_SEEN_KEY) === '1' });

export function saveProfile(p: UserProfile): void {
  const clean: UserProfile = {
    workArea: AREAS.some((a) => a.value === p.workArea) ? p.workArea : 'otro',
    goals: GOALS.filter((g) => (p.goals ?? []).includes(g.value)).map((g) => g.value),
    needTaskContext: !!p.needTaskContext,
    organizationProblems: (p.organizationProblems ?? '').trim(),
    extra: (p.extra ?? '').trim(),
    updatedAt: new Date().toISOString(),
  };
  profile.data = clean;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(clean));
  } catch {
    // storage lleno o bloqueado: no rompemos la app
  }
  markWelcomeSeen();
}

export function clearProfile(): void {
  profile.data = null;
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    // noop
  }
}

/** Marca que ya se vio la bienvenida (para no re-abrirla en cada carga). */
export function markWelcomeSeen(): void {
  welcomeSeen.value = true;
  try {
    localStorage.setItem(WELCOME_SEEN_KEY, '1');
  } catch {
    // noop
  }
}

/** Payload compacto que se manda al backend (undefined si no hay perfil útil). */
export function profilePayload(): UserProfile | undefined {
  const p = profile.data;
  if (!p) return undefined;
  if (!p.goals.length && !p.organizationProblems && !p.extra && p.workArea === 'otro') {
    return undefined;
  }
  return p;
}