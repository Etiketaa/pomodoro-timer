# CONTEXTO — Pomodoro/Lofi → proyecto "la sala"

> Documento de traspaso entre sesiones. Generado 2026-09-25.
> **No está commiteado** (queda untracked). Borrar o mover cuando ya no haga falta.

---

## 1. La idea, según el dueño del proyecto

La idea original **no era un pomodoro**. Era:

- **Un Notion propio**: un espacio personal con páginas customizables por cliente/usuario.
- **Registro de usuarios sin vulnerar sus datos** — datos estrictamente privados, es un requisito de diseño, no un extra.
- **Tareas compartidas tipo Trello**, con gestión real.
- **Control de páginas** (la personalización era parte del producto).

El pomodoro apareció porque **los pomodoros que existen son aburridos**: un reloj, un descanso, fin del asunto. Eso no le servía como producto.

El proyecto mutó entonces a **reproductor de lofi**, y esa parte **sí le funcionó durante mucho tiempo**. Después le agregó, en este orden:

- Auth de cuentas con Google
- Chat entre usuarios
- Streaming de lo que el usuario quiera
- Conexión con una radio
- Fondos y motivos de temporada
- Agente de IA para ayudar al usuario → **no funcionó**
- Perfil de usuario con onboarding por área de trabajo

Y ahí se murió el proyecto.

---

## 2. Diagnóstico de por qué murió

**a) El núcleo se perdió.** La página/espacio personal era el producto. El lofi era *una función*. Cuando el lofi pasó a ser el centro, las páginas quedaron decorativas.

**b) Features sin tesis.** Auth, chat, streaming arbitrario, radio, temporadas = productos distintos pegados. El **chat entre usuarios es el más peligroso**: convierte un lugar de foco en una red social, y ahí aparece el peso, el costo y la responsabilidad de privacidad que abortaron el proyecto.

**c) El agente falló porque no tenía trabajo.** Era una caja de chat. Sin tools contra la base, sin estado entre sesiones, sin un objetivo concreto — y sumando latencia a una app cuyo propósito es que hagas cosas rápido.

> **Contraste útil:** en el proyecto `finanzas` (otro repo, mismo dueño) el agente **sí funcionó**, porque tiene tareas reales, tools reales contra la base, confirmación de acciones sensibles en el backend y proveedor de LLM intercambiable. Ese es el patrón que faltó acá.

---

## 3. Estado real verificado del repo (no es lo que sugería el relato)

Ruta: `/home/franco/pomodoro-timer` · git limpio · **172 archivos versionados** · `.env` **NO** está commiteado (solo `.env.example`, bien).

**Stack:** Flask (`requirements.txt`, `templates/`, `static/`) + **frontend Svelte** (`frontend/`, Tailwind, PostCSS, `node_modules` ya instalado) + **SPA estática en `public/`** con service worker y manifest PWA + deploy en Vercel (`vercel.json`, `.vercel/`).

**Módulos del backend en `api/`:**
`agent.py`, `agent_client.py`, `groq_client.py`, `auth.py`, `chat.py`, `crypto.py`, `db.py`, `feedback.py`, `socketio_handler.py`, `sync.py`, `index.py`

**Hallazgos relevantes:**
- Hay **más de un proveedor de LLM**: NVIDIA *y* Groq. El patrón de proveedor intercambiable ya se hizo una vez.
- **`crypto.py` ya existe** → la encryptación de datos privados ya se attacked una vez. No es territorio virgen.
- `socketio_handler.py` + `sync.py` → realtime y sincronización ya implementados.
- `chatbot_model.h5`, `intents.json`, `train.py` → un chatbot clásico de intents (Keras) conviviendo con el agente moderno. **Dos chatbots en el mismo proyecto.**
- **Tres frontends conviviendo**: `frontend/` (Svelte), `public/` (SPA), `templates/` (Flask/Jinja). Eso *es* el bloat, medido.

**Git log reciente** (el proyecto se的都abdandonóstopping en este punto):
```
ba6abcb feat: perfil de usuario con onboarding de bienvenida por área de trabajo
a3fbbd4 fix(pwa): boton Instalar funcional + manifest icons sin 404 + SW registrado
3b33b96 chore: ignorar .env.local generado por vercel link
fd6fa2a feat: deploy vercel listo — build SPA nuevo con 5 features agenticos en public/
3a0f436 feat: 5 features agénticos con NVIDIA free tier (mistral-nemotron)
```

**El README está desactualizado**: describe "A simple Pomodoro Timer" con features que ya no reflejan el proyecto. No menciona la SPA, el agente, el chat, el calendario ni la galería.

**Nota importante:** el relato sugiere que la parte de "Notion propio / páginas customizables / tareas compartidas" se perdió. El código confirma que **no hay modelo de páginas ni de contenido de usuario** — hay tasks, calendar, gallery, feedback. El Notion propio nunca llegó a construirse.

---

## 4. Tesis propuesta: **la sala**

La unidad del producto deja de ser la nota, el pomodoro o el player. **Es la sala.**

> Cada sala tiene contenido, tareas, gente y una atmósfera. Entrás a trabajar, hacés algo, salís.

De ahí sale todo lo que ya te funcionó:

| Pieza actual | Qué pasa con la tesis |
|---|---|
| Reproductor lofi | Pasa a ser **el ambiente de la sala**. El audio se mueve con vos entre salas; si abrís tres, el sonido viaja. Deja de ser un player y se vuelve un *lugar*. |
| Temporizador | Deja de ser protagonista. El pomodoro sobrevive como **mecánica interna**, nunca como "reloj vacío" en pantalla. |
| Fondos y temporadas | La sala **cambia de piel** según la fecha. Ya gustaba; ahora tiene función. |
| Tareas | Pasan a vivir *dentro* de la sala, no en una app aparte tipo Trello. |
| Chat entre usuarios | **Se elimina.** Se reemplaza por presencia en foco. |
| Agente | Recibe trabajos concretos (abajo). |

**Cómo se arregla el pomodoro aburrido — sin reloj vacío:**
1. Abrís la sala.
2. Escribís **una frase de compromiso**: "hoy termino el borrador del contrato".
3. La app muestra esa frase + el ambiente. El tiempo corre, pero no es el protagonista.
4. Al salir, una línea: *¿lo terminaste?* → el resultado se escribe en la sala.

La unidad de medida pasa de **minutos** a **compromiso con un artefacto**.

**Dos features diferenciales que encajan con lo que ya te gustaba:**
- **Atmósfera adaptativa**: distinto sonido de mañana, de tarde, de noche.
- **Sonido compartido**: si alguien más está en foco en la misma sala, el ambiente se sincroniza. Presencia real **sin vigilancia y sin chat**.

---

## 5. El agente, esta vez con trabajo

Tres trabajos concretos, no "ayudar al usuario":

1. **Convertir contexto en estructura** → "de estas notas sacame las tareas con fecha".
2. **Leer el histórico** → "¿qué vengo abandonando hace tres semanas?".
3. **Preparar la sesión** → "voy a trabajar en X, armame el contexto de X en una pantalla".

Reglas a heredar del proyecto `finanzas` (donde sí funcionó):
- Tools reales contra la base de datos.
- **Confirmación en el backend** para todo lo sensible (borrar, compartir, archivar).
- Proveedor intercambiable (NVIDIA ya se hizo; Groq también).
- **Opt-in explícito**: la IA solo ve la página que le pedís. Nunca indexa todo el workspace a la nube.

---

## 6. Antídoto contra el bloat (esto es lo que faltó)

- **Núcleo**: salas, bloques, tareas, búsqueda. Nada más.
- **Módulos instalables**: foco, ambiente, compartir, agente, temas.

**Regla dura:** un módulo se puede desactivar y borrar sin romper el núcleo. Si no cumple eso, no entra. Eso es lo que hace el proyecto realmente "upgradeable".

---

## 7. Privacidad (requisito, no feature)

- **Local-first, sin cuenta obligatoria**: identidad por passkey o clave de recuperación, no por email. *"No necesito registrarme"* es feature.
- **Compartir = por sala, revocable, con cifrado en el cliente**. El servidor nunca ve el contenido de una sala compartida. Ojo: `api/crypto.py` ya existe, hay que ver qué cubre.
- **IA opt-in y por pedido**, sin analytics de terceros ni tracking de uso.

---

## 8. Evidencia que_plateó las decisiones

- **El Pomodoro fijo no funciona como se cree.** Smits, Wenzel & de Bruin (2025), *Behavioral Sciences* — 94 estudiantes, Pomodoro vs Flowtime vs autorregulado: **sin diferencia significativa en productividad real**, pero los descansos de Pomodoro y Flowtime学习和SJIncrease fatigue faster and motivation drops faster. → https://pmc.ncbi.nlm.nih.gov/articles/PMC12292963/
- **Attention residue** (Leroy, 2009): cambiar de tarea deja residuo cognitivo y el rendimiento en la tarea B baja igual. → https://www.sciencedirect.com/science/article/abs/pii/S0749597809000399
  → De ahí sale: **una sola tarea por sesión + nota de "próxima acción" al cerrar**. Es la antidosis directa al multitasking.
- **Blocking de distracciones** (Microsoft Research, CHI): con bloqueo, la productividad autoevaluada y el tiempo de foco aumentan. Pero hay evidencia de que a la gente con mucho autocontrol la bloqueadora le genera estrés y le hace saltear descansos. → https://www.microsoft.com/en-us/research/publication/how-blocking-distractions-affects-workplace-focus-and-productivity/
  → De ahí sale: bloqueo con **costo de override**, no muro absoluto.
- **Chronotype** (Facer-Childs 2018): la performance cognitiva depende de la hora del día y del cronotipo. → https://link.springer.com/article/10.1186/s40798-018-0162-z
  ⚠️ Matiz honesto: una revisión 2025 halló que en >80% de los estudios **no hay efecto principal** del chronotipo. Sirve como auto-observación, no como dogma. El "90/20 ultradianos" que circula en blogs tiene evidencia débil: dejarlo como experimentación opcional.
- **Planning fallacy** (Ahmetoglu, ACM 2024): se sobreestima sistemáticamente el tiempo de una tarea. → De ahí sale: la app **aprende tu sesgo personal de estimación**.
- **66 días, no 21** (Lally et al., 2010): mediana hasta automaticidad, rango 18–254 días. → https://pmc.ncbi.nlm.nih.gov/articles/PMC3505409/
  → De ahí sale: mapa de calor de constancia en vez de racha que se rompe y castiga.

---

## 9. Decisiones pendientes (nadie las tomó todavía)

1. **¿Sala o workspace?** ¿Una "sala" es una página, un proyecto, o un espacio?
2. **¿分享/collaborators entra en la v1?** Es la parte que más матó el proyecto la vez pasada. Postponer es una opción legítima.
3. **¿Los datos privados son cifrado en cliente (el servidor no los ve) o solo "no los vendemos"?** Define toda la arquitectura.
4. **¿Reconstruir o rescatar?** Hay ~172 archivos, 3 frontends y 2 chatbots. Reconstruir limpio puede ser más barato que ordenar.
5. **¿Se tira el frontend Svelte o el de `public/`?** Hoy conviven tres.

---

## 10. Próximo paso sugerido

Antes de escribir código: **decidir las 5 preguntas de la sección 9**. Después, un prototipo mínimo de una sola sala (nota + tareas + frase de compromiso + ambiente) para ver si la idea *se siente* bien antes de recuperar o descartar 172 archivos.

---

### Tracke related

- `finanzas/` — proyecto hermano. Es el **patrón de referencia** para el agente (tools reales, confirmación backend, proveedor intercambiable, todo en español, montos en centavos).
