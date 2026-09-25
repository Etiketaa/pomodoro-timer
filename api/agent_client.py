"""Cliente agéntico para Lofi Pomodoro.

Reutiliza la misma infraestructura que groq_client (NVIDIA NIM vía
integrate.api.nvidia.com) con prompts dedicados por feature y salida JSON
validada, para que el frontend consuma respuestas estructuradas sin parsing
frágil.

Cada método de este cliente se corresponde con un endpoint de api/agent.py:
  - split_task        -> descomposición en micro-pasos ~10 min
  - daily_plan        -> top 3 de foco para el día
  - ritual_reflection -> coach del shutdown ritual
  - weekly_insights   -> patrones semanales + tareas atascadas
"""

import json
import os
import re

from openai import OpenAI
from dotenv import load_dotenv

# Cargar .env desde la raíz del proyecto (igual que groq_client)
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(dotenv_path=os.path.join(project_root, '.env'))

MODEL = "mistralai/mistral-nemotron"

_SYSTEM_BASE = (
    "Sos un coach de productividad experto en la técnica Pomodoro, "
    "con un tono cercano, directo y sin pelotudeces. Respondés SIEMPRE en "
    "español rioplatense. Escribís en minúsculas salvo donde corresponda, "
    "con frases cortas. No usás comillas tipográficas ni más de 2 líneas por "
    "punto. No inventás datos que no vienen en el contexto. Nunca repetís la "
    "tarea que el usuario ya escribió palabra por palabra: la reformulás con "
    "verbos de acción concretos."
)


class AgentClient:
    def __init__(self):
        self.api_key = os.getenv('NVIDIA_API_KEY')
        if not self.api_key:
            raise ValueError("NVIDIA_API_KEY not found in environment variables")

        # timeouts cortos: NVIDIA puede tardar en devolver un error transitorio
        # (default del SDK: 600s + 2 reintentos -> ~5 min colgado). Con estos,
        # una llamada lenta falla en <2 min y no congela el server.
        self.client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=self.api_key,
            timeout=120.0,
            max_retries=1,
        )
        self.model = MODEL

    # ------------------------------------------------------------------ #
    #  Infraestructura de llamada
    # ------------------------------------------------------------------ #
    def _complete(self, system, user, temperature=0.3, max_tokens=900):
        """Llamada única a NVIDIA intentando JSON mode, con fallback plano."""
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]
        kwargs = dict(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        try:
            # JSON mode: el modelo devuelve un objeto JSON plano.
            res = self.client.chat.completions.create(
                **kwargs, response_format={"type": "json_object"}
            )
        except Exception:
            # Algunos deployments rechazan response_format: reintento plano.
            res = self.client.chat.completions.create(**kwargs)
        content = res.choices[0].message.content
        if not content:
            raise RuntimeError("Model returned empty content")
        return content

    def _complete_json(self, system, user, temperature=0.3, max_tokens=900):
        raw = self._complete(system, user, temperature, max_tokens)
        return self._parse_json(raw)

    @staticmethod
    def _parse_json(raw):
        if not raw:
            raise ValueError("Empty response from model")
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
        # Fallback: extraer el primer bloque JSON envolvente
        match = re.search(r'\{.*\}', raw, re.DOTALL | re.MULTILINE)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        raise ValueError(f"Model returned non-JSON: {raw[:200]!r}")

    # ------------------------------------------------------------------ #
    #  Serialización de contexto (formato del store nuevo)
    # ------------------------------------------------------------------ #
    @staticmethod
    def _fmt_profile(profile):
        """Serializa el perfil del usuario (área, qué mejorar, contexto, problemas).

        Devuelve un string vacío si no hay perfil o no aporta nada, para no
        ensuciar el prompt cuando el usuario nunca completó el onboarding.
        """
        if not profile or not isinstance(profile, dict):
            return ""
        lines = []
        area = profile.get("workArea") or ""
        areas = {
            "administracion": "Administración",
            "ventas": "Ventas / atención",
            "logistica": "Logística / operaciones",
            "tecnico": "Técnico / desarrollo",
            "creativo": "Creativo / diseño",
            "otro": "Otro",
        }
        if area in areas:
            lines.append(f"- Área de trabajo: {areas[area]}")
        goals_map = {
            "enfoque": "enfocarse más",
            "organizacion": "organizar su día",
            "procrastinacion": "dejar de postergar",
            "energia": "manejar su energía",
            "velocidad": "ser más rápido",
            "equilibrio": "equilibrar trabajo/descanso",
        }
        goals = profile.get("goals") or []
        goal_labels = [goals_map.get(str(g), str(g)) for g in goals if goals_map.get(str(g))]
        if goal_labels:
            lines.append(f"- Qué quiere mejorar: {', '.join(goal_labels)}")
        need_ctx = profile.get("needTaskContext")
        if need_ctx is not None:
            lines.append(
                f"- ¿Quiere contexto de sus tareas al aconsejar?: "
                f"{'sí' if need_ctx else 'no'}"
            )
        org = (profile.get("organizationProblems") or "").strip()
        if org:
            lines.append(f"- Problemas de organización: {org}")
        extra = (profile.get("extra") or "").strip()
        if extra:
            lines.append(f"- Otra información: {extra}")
        if not lines:
            return ""
        return "PERFIL DEL USUARIO (usalo para personalizar la respuesta):\n" + "\n".join(lines)

    @staticmethod
    def _fmt_tasks(tasks, limit=20):
        """Serializa tareas del store nuevo (title/energy/status/subtasks)."""
        if not tasks:
            return "(sin tareas)"
        lines = []
        status_emoji = {"todo": "📋", "doing": "⚡", "done": "✅"}
        energies = {"high": "energía alta", "medium": "energía media", "low": "energía baja"}
        for t in tasks[:limit]:
            emoji = status_emoji.get(t.get("status", "todo"), "📋")
            energy = energies.get(t.get("energy"), "")
            subs = t.get("subtasks") or []
            subs_txt = f" ({len(subs)} sub-tareas)" if subs else ""
            title = (t.get("title") or t.get("text") or "Sin título").strip()
            lines.append(
                f"- [{t.get('id')}] {emoji} {title} | {energy}{subs_txt}"
            )
        return "\n".join(lines)

    # ------------------------------------------------------------------ #
    #  Split de tareas
    # ------------------------------------------------------------------ #
    def split_task(self, title, energy="medium", context="", profile=None):
        """Descompone una tarea vaga en pasos accionables de ~10 min."""
        profile_txt = self._fmt_profile(profile)
        system = (
            f"{_SYSTEM_BASE}\n\n"
            "Tu trabajo: descomponer UNA tarea vaga en micro-pasos accionables "
            "de 5-15 minutos cada uno (ideal 10). Cada paso debe poder hacerse "
            "sin más planificación: arranca con un verbo de acción concreto "
            "(buscar, escribir, armar, testear, mandar, llamar...).\n"
            "Reglas:\n"
            "- Entre 3 y 6 pasos. Si la tarea es chica, 3; si es grande, hasta 6.\n"
            "- No agregues pasos de reflexión ni 'revisar lo hecho'. Solo ejecución.\n"
            "- Priorizá el primer paso para destrabar el arranque (el más fácil y concreto).\n"
            "- No inventes herramientas, reuniones ni personas que no existen.\n"
            "- Salida EXACTA en JSON con esta forma:\n"
            '{"parts": [{"title": "paso 1", "estimatedMinutes": 10}, ...]}'
        )
        user = (
            f"TAREA A DIVIDIR: {title}\n"
            f"ENERGÍA DISPONIBLE: {energy}\n"
            f"{('CONTEXTO ADICIONAL: ' + context) if context else ''}\n"
            f"{profile_txt}"
        )
        data = self._complete_json(system, user, temperature=0.4)
        parts = data.get("parts", [])
        # Sanitizar: solo strings no vacíos y minutos razonables
        clean = []
        for p in parts:
            t = (p.get("title") or "").strip()
            if not t or len(t) > 120:
                continue
            mins = int(p.get("estimatedMinutes") or 10)
            clean.append({"title": t, "estimatedMinutes": min(max(mins, 5), 30)})
        if not clean:
            raise ValueError("Model returned no usable parts")
        return {"parts": clean}

    # ------------------------------------------------------------------ #
    #  Plan diario
    # ------------------------------------------------------------------ #
    def daily_plan(self, pending, energy_today, streak, note, yesterday_focus="", profile=None):
        """Sugiere los top 3 focos del día."""
        profile_txt = self._fmt_profile(profile)
        system = (
            f"{_SYSTEM_BASE}\n\n"
            "Tu trabajo: armar el plan del día. Elegís EXACTAMENTE 3 focos, "
            "idealmente 2 de tareas existentes y a lo sumo 1 nuevo si falta "
            "algo importante.\n"
            "Criterios de elección:\n"
            "- La tarea urgente/importante que destraba a las demás primero.\n"
            "- Tareas con vencimiento (date) hoy o mañana.\n"
            "- Lo que el usuario dijo que quería hacer hoy (yesterday_focus) "
            "si sigue pendiente.\n"
            "- Balance según la energía: si la energía es baja, priorizá "
            "tareas livianas y proponé un solo foco pesado.\n"
            "- Si hay perfil del usuario, alineá los focos con lo que quiere "
            "mejorar y evitá sus problemas de organización conocidos.\n"
            "- Respetá el orden: el foco 1 es el que hay que atacar primero.\n"
            "Reglas:\n"
            "- Si elegís una tarea existente, usás su id EXACTO del contexto.\n"
            "- Un foco nuevo (fuera del contexto) solo si es imprescindible.\n"
            "- Salida EXACTA en JSON:\n"
            '{"message": "una línea amigable que abre el plan", '
            '"focus": [{"taskId": "id exacto o null", "title": "título a mostrar", '
            '"reason": "por qué va primero (máx 12 palabras)"}, ...]}'
        )
        user = (
            f"TAREAS PENDIENTES (todo/doing):\n{self._fmt_tasks(pending)}\n"
            f"ENERGÍA HOY: {energy_today}\n"
            f"RACHA: {streak} día(s)\n"
            f"NOTA DEL DÍA (brain dump): {(note or '(vacía)')[:600]}\n"
            f"FOCO QUE DIJO QUE QUERÍA HACER HOY: {(yesterday_focus or '(ninguno)')}\n"
            f"{profile_txt}"
        )
        data = self._complete_json(system, user, temperature=0.4, max_tokens=700)
        focus = data.get("focus", [])[:3]
        clean_focus = []
        for f in focus:
            task_id = f.get("taskId") or None
            title = (f.get("title") or "").strip()
            if not title:
                continue
            clean_focus.append({
                "taskId": task_id if task_id and task_id != "null" else None,
                "title": title[:120],
                "reason": (f.get("reason") or "")[:120],
            })
        return {
            "message": (data.get("message") or "acá va tu plan de hoy.").strip(),
            "focus": clean_focus,
        }

    # ------------------------------------------------------------------ #
    #  Ritual de cierre
    # ------------------------------------------------------------------ #
    def ritual_reflection(self, went_well, was_hard, tomorrow_focus, mood,
                          completed_count, streak, profile=None):
        """Coach del shutdown ritual: 2-3 líneas + un tip para mañana."""
        profile_txt = self._fmt_profile(profile)
        system = (
            f"{_SYSTEM_BASE}\n\n"
            "Tu trabajo: cerrar el día del usuario con una reflexión breve como "
            "la haría un buen coach. Sin sermones, sin listas largas.\n"
            "Formato de la respuesta:\n"
            "1. 'reflection': 2-3 líneas que (a) reconozcan lo que salió bien "
            "sin repetirlo literal, (b) tomen UN aprendizaje de lo que costó "
            "con empatía cero culpa, y (c) conecten con el foco de mañana.\n"
            "2. 'tip': una recomendación concreta y accionable para mañana "
            "(máx 15 palabras), basada en lo que dijo.\n"
            "Si el usuario terminó enérgico, celebrálo. Si terminó bajo, "
            "normalizá y proponé algo chico.\n"
            "Si hay perfil del usuario, conectá la reflexión con lo que "
            "quiere mejorar (sin sermonear).\n"
            "Salida EXACTA en JSON:\n"
            '{"reflection": "texto", "tip": "texto"}'
        )
        user = (
            f"QUÉ SALIÓ BIEN: {went_well or '(nada especificado)'}\n"
            f"QUÉ COSTÓ: {was_hard or '(nada especificado)'}\n"
            f"FOCO PARA MAÑANA: {tomorrow_focus or '(sin definir)'}\n"
            f"CÓMO TERMINÓ EL DÍA: {mood}\n"
            f"TAREAS COMPLETADAS HOY: {completed_count}\n"
            f"RACHA ACTUAL: {streak} día(s)\n"
            f"{profile_txt}"
        )
        data = self._complete_json(system, user, temperature=0.5, max_tokens=500)
        return {
            "reflection": (data.get("reflection") or "").strip(),
            "tip": (data.get("tip") or "").strip(),
        }

    # ------------------------------------------------------------------ #
    #  Insights semanales + tareas atascadas
    # ------------------------------------------------------------------ #
    def weekly_insights(self, tasks, shutdown_entries, completed_counts, streak, profile=None):
        """Detecta patrones de la semana y tareas que llevan muchos días en doing."""
        profile_txt = self._fmt_profile(profile)
        # --- Detección local (determinística, no depende del LLM) ---
        stuck = []
        for t in tasks:
            if t.get("status") != "doing":
                continue
            created = t.get("createdAt") or ""
            days = 0
            try:
                from datetime import datetime, timezone
                created_dt = datetime.fromisoformat(created)
                if created_dt.tzinfo is None:
                    created_dt = created_dt.replace(tzinfo=timezone.utc)
                days = max(0, int((datetime.now(timezone.utc) - created_dt).total_seconds() // 86400))
            except Exception:
                pass
            if days >= 2:
                stuck.append({
                    "title": (t.get("title") or "Sin título").strip(),
                    "daysInDoing": days,
                    "taskId": t.get("id"),
                    "suggestion": "dividila en pasos de ~10 min o replanificala",
                })
        stuck = sorted(stuck, key=lambda s: s["daysInDoing"], reverse=True)[:5]

        # --- Contexto para el LLM ---
        done_titles = [
            (t.get("title") or "").strip()
            for t in tasks
            if t.get("status") == "done"
        ][-15:]

        shutdown_txt = "(sin entradas de ritual esta semana)"
        if shutdown_entries:
            rows = []
            for e in shutdown_entries[-7:]:
                rows.append(
                    f"- {e.get('date')} | bien: {e.get('whatWentWell') or '-'} | "
                    f"costó: {e.get('whatWasHard') or '-'} | "
                    f"mañana: {e.get('tomorrowFocus') or '-'} | "
                    f"mood: {e.get('mood') or '-'}"
                )
            shutdown_txt = "\n".join(rows)

        system = (
            f"{_SYSTEM_BASE}\n\n"
            "Tu trabajo: analizar la semana de productividad del usuario y "
            "devolver 3 a 5 insights accionables.\n"
            "Buscá patrones reales entre:\n"
            "- qué días/tareas se completan y cuáles no\n"
            "- relación entre el mood del cierre y las tareas del día siguiente\n"
            "- qué tipos de tarea se postergan (bien/costó repetidos)\n"
            "- consistencia de la racha\n"
            "Reglas:\n"
            "- No inventes datos. Si no hay suficiente data semanal (<2 entradas "
            "de ritual), decilo y proponé una recomendación general.\n"
            "- Si hay perfil del usuario, priorizá los patrones que tengan que "
            "ver con lo que quiere mejorar.\n"
            "- Cada insight: 1 frase concreta + qué ajuste harías.\n"
            "- Salida EXACTA en JSON:\n"
            '{"summary": "una línea de síntesis", '
            '"insights": ["insight 1", "insight 2", ...]}'
        )
        user = (
            f"COMPLETADAS ESTA SEMANA (por día): {completed_counts or '(sin datos)'}\n"
            f"TAREAS HECHAS (últimas): {', '.join(done_titles) if done_titles else '(ninguna)'}\n"
            f"RACHA ACTUAL: {streak}\n"
            f"ENTRADAS DEL RITUAL (últimos 7 días):\n{shutdown_txt}\n"
            f"{profile_txt}"
        )
        data = self._complete_json(system, user, temperature=0.4, max_tokens=700)
        insights = [i.strip() for i in data.get("insights", []) if i and i.strip()][:5]
        return {
            "summary": (data.get("summary") or "").strip(),
            "insights": insights,
            "stuckTasks": stuck,
        }


# Singleton (mismo patrón que groq_client)
_agent_client = None


def get_agent_client():
    global _agent_client
    if _agent_client is None:
        _agent_client = AgentClient()
    return _agent_client