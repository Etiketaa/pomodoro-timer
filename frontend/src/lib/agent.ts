/**
 * Cliente tipado de las features agénticas (api/agent.py).
 *
 * Todas las respuestas llegan con { ok: true, ... } o { ok: false, error }.
 */
import { post, get } from './api';
import type { Energy, Task, ShutdownEntry } from './stores/singleton';
import { profilePayload } from './stores/profile.svelte';

export type AgentPart = { title: string; estimatedMinutes: number };

export type PlanFocus = {
  taskId: string | null;
  title: string;
  reason: string;
};

export type DailyPlan = {
  message: string;
  focus: PlanFocus[];
};

export type RitualReflection = {
  reflection: string;
  tip: string;
};

export type StuckTask = {
  title: string;
  daysInDoing: number;
  taskId?: string;
  suggestion: string;
};

export type WeeklyInsights = {
  summary: string;
  insights: string[];
  stuckTasks: StuckTask[];
};

type AgentResponse<T> = { ok: true } & T;

/** Procesa la respuesta agéntica lanzando Error si el backend reportó fallo. */
function unwrap<T>(res: { ok: boolean; error?: string } & T): T {
  if (!res.ok) throw new Error(res.error ?? 'El asistente no respondió');
  return res;
}

export async function agentSplit(
  title: string,
  energy: Energy = 'medium',
  context = '',
): Promise<{ parts: AgentPart[] }> {
  const res = await post<AgentResponse<{ parts: AgentPart[] }>>('/api/agent/split', {
    title,
    energy,
    context,
    profile: profilePayload(),
  });
  return unwrap(res);
}

export async function agentPlan(args: {
  tasks: Task[];
  energyToday?: Energy | 'all';
  streak?: number;
  note?: string;
  yesterdayFocus?: string;
}): Promise<DailyPlan> {
  const res = await post<AgentResponse<DailyPlan>>('/api/agent/plan', {
    tasks: args.tasks,
    energyToday: args.energyToday ?? 'medium',
    streak: args.streak ?? 0,
    note: args.note ?? '',
    yesterdayFocus: args.yesterdayFocus ?? '',
    profile: profilePayload(),
  });
  return unwrap(res);
}

export async function agentRitual(args: {
  wentWell: string;
  wasHard: string;
  tomorrowFocus: string;
  mood: Energy;
  completedCount: number;
  streak: number;
}): Promise<RitualReflection> {
  const res = await post<AgentResponse<RitualReflection>>('/api/agent/ritual', {
    ...args,
    profile: profilePayload(),
  });
  return unwrap(res);
}

export async function agentInsights(args: {
  tasks: Task[];
  shutdownEntries: ShutdownEntry[];
  completedCounts: { date: string; count: number }[];
  streak: number;
}): Promise<WeeklyInsights> {
  const res = await post<AgentResponse<WeeklyInsights>>('/api/agent/insights', {
    tasks: args.tasks,
    shutdownEntries: args.shutdownEntries,
    completedCounts: args.completedCounts,
    streak: args.streak,
    profile: profilePayload(),
  });
  return unwrap(res);
}

export async function agentHealth(): Promise<{ available: boolean }> {
  const res = await get<AgentResponse<{ available: boolean }>>('/api/agent/health');
  return unwrap(res);
}