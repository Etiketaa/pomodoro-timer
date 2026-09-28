/**
 * La sala: la unidad real del producto.
 *
 * Tesis: la unidad de medida NO son los minutos, es el compromiso con un
 * artefacto. Abrís una sala, escribís una frase de compromiso
 * ("hoy termino el borrador del contrato"), trabajás, y al salir respondés
 * una sola pregunta: ¿lo terminaste? El resultado se escribe en la sala.
 *
 * Decisiones que vienen de la evidencia y no del gusto:
 *
 * - UNA tarea por sesión. El attention residue (Leroy, 2009) muestra que
 *   cambiar de tarea deja residuo cognitivo: el rendimiento en la tarea B
 *   baja igual aunque la B sea la que estas haciendo. Por eso la sala
 *   cuelga de UNA tarea, y al cerrar se escribe la "próxima acción" para
 *   que retomar no requiera re-leer todo.
 * - El timer NO es protagonista. Sobrevive como mecánica interna. El
 *   pomodoro fijo no muestra diferencia significativa en productividad real
 *   (Smits et al. 2025), así que no puede ser el producto.
 * - Constancia por mapa de calor, no por racha. Lally et al. (2010):
 *   la mediana hasta automaticidad es 66 días con rango 18-254. Una racha
 *   que se rompe castiga justo a la gente que tarda más, que es la mayoría.
 */

import type { Energy, Task } from './tasks.svelte.ts';
// OJO: este módulo NO importa de singleton.ts a propósito. singleton.ts crea
// el salaStore, así que un import de vuelta formaría un ciclo. El store
// recibe la lista de tareas por parámetro en vez de conocer el singleton.

export type SalaResultado = 'terminado' | 'parcial' | 'abandonado';

/** Cómo se siente la franja del día: define la atmósfera de la sala. */
export type Franja = 'madrugada' | 'manana' | 'tarde' | 'noche';

export type Sala = {
  id: string;
  creadaAt: string;
  /** La frase de compromiso. Es el centro de la sala. */
  compromiso: string;
  /** Tarea del store existente (opcional — uno puede trabajar sin tarea). */
  taskId?: string;
  /** Contexto libre que uno se escribe al entrar. */
  nota: string;
  /** Energía con la que se abre la sala. */
  energia: Energy;
  franja: Franja;

  // ---- cierre ----
  cerradaAt?: string;
  resultado?: SalaResultado;
  /** Obligatoria si resultado !== 'terminado': la próxima acción concreta. */
  proximaAccion?: string;
  /** Minutos reales trascurridos en la sala. */
  minutos?: number;
};

const SALAS_KEY = 'salasV1';

function loadSalas(): Sala[] {
  try {
    const raw = localStorage.getItem(SALAS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSalas(salas: Sala[]) {
  try {
    localStorage.setItem(SALAS_KEY, JSON.stringify(salas));
  } catch (e) {
    // Cuota llena o modo privado: la sala sigue viva en memoria, solo no
    // persiste. No cortamos la sesión por eso.
    console.warn('[sala] no se pudo guardar:', e);
  }
}

/** La franja del día, que es lo que define la atmósfera. */
export function franjaAhora(d: Date = new Date()): Franja {
  const h = d.getHours();
  if (h >= 5 && h < 12) return 'manana';
  if (h >= 12 && h < 19) return 'tarde';
  if (h >= 19 && h < 24) return 'noche';
  return 'madrugada';
}

export const FRANJA_LABEL: Record<Franja, string> = {
  madrugada: 'de madrugada',
  manana: 'de mañana',
  tarde: 'de tarde',
  noche: 'de noche',
};

export type Estacion = {
  /** Id del canal en SomaFM. Es también el path del stream. */
  id: string;
  nombre: string;
  /** Lo que el canal dice de sí mismo, entre comillas. */
  sePresenta: string;
};

const STREAM = (id: string) => `https://ice1.somafm.com/${id}-128-mp3`;

/**
 * La atmósfera de cada franja.
 *
 * Ojo con el alcance de esto: es una curaduría, no un hallazgo. Lo único
 * verificado es que los cuatro streams existen y suenan (SomaFM, MP3 128 kbps,
 * HTTP 206 + `audio/mpeg`, comprobado el 2026-09-28). Que la curva de densidad
 * sirva para concentrarse es una intuición minha, no un dato.
 *
 * El criterio es de densidad, no de vibra. De menos a más:
 *
 *   madrugada   Drone Zone          "texturas atmosféricas, beats mínimos"
 *   mañana      Groove Salad        "ambient/downtempo, bien frío"
 *   tarde       Space Station Soma  "ambient y electrónica mid-tempo": más empuje
 *   noche       Secret Agent        lounge, para bajar
 *
 * La tarde es la que más empuja porque es la hora en que el trabajo se pone
 * difícil, no la más relajada. Si a vos te pasa al revés, cambiala acá: es un
 * objeto, no una constante escondida.
 */
export const ATMOSFERA: Record<Franja, Estacion> = {
  madrugada: {
    id: 'dronezone',
    nombre: 'Drone Zone',
    sePresenta: 'texturas atmosféricas con beats mínimos',
  },
  manana: {
    id: 'groovesalad',
    nombre: 'Groove Salad',
    sePresenta: 'ambient y downtempo, bien frío',
  },
  tarde: {
    id: 'spacestation',
    nombre: 'Space Station Soma',
    sePresenta: 'ambient y electrónica mid-tempo',
  },
  noche: {
    id: 'secretagent',
    nombre: 'Secret Agent',
    sePresenta: 'lounge, para bajar',
  },
};

export function streamDe(e: Estacion) {
  return STREAM(e.id);
}

export const RESULTADO_LABEL: Record<SalaResultado, string> = {
  terminado: 'Terminado',
  parcial: 'A medias',
  abandonado: 'No lo terminé',
};

export function createSalaStore() {
  let salas = $state<Sala[]>(loadSalas());

  const activa = $derived.by(() => salas.find((s) => !s.cerradaAt) ?? null);

  const historial = $derived.by(() =>
    salas
      .filter((s) => s.cerradaAt)
      .sort((a, b) => (b.cerradaAt! > a.cerradaAt! ? 1 : -1))
  );

  /**
   * Mapa de calor de constancia en vez de racha. Cuenta salas cerradas por
   * día en una ventana reciente. Fallar un día no resetea nada.
   */
  const constancia = $derived.by(() => {
    const porDia = new Map<string, number>();
    for (const s of salas) {
      if (!s.cerradaAt) continue;
      const dia = s.cerradaAt.slice(0, 10);
      porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
    }
    const dias: { date: string; count: number }[] = [];
    const hoy = new Date();
    for (let i = 83; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dias.push({ date: key, count: porDia.get(key) ?? 0 });
    }
    return dias;
  });

  const totalCerradas = $derived(historial.length);
  const terminadas = $derived(
    historial.filter((s) => s.resultado === 'terminado').length
  );

  function abrir(compromiso: string, taskId?: string, energia: Energy = 'medium') {
    const limpio = compromiso.trim();
    if (!limpio) return null;
    if (activa) cerrarInterno(activa.id); // no puede haber dos salas abiertas

    const sala: Sala = {
      id: crypto.randomUUID(),
      creadaAt: new Date().toISOString(),
      compromiso: limpio,
      taskId,
      nota: '',
      energia,
      franja: franjaAhora(),
    };
    salas = [...salas, sala];
    saveSalas(salas);
    return sala.id;
  }

  function cerrarInterno(id: string) {
    salas = salas.map((s) =>
      s.id === id && !s.cerradaAt
        ? {
            ...s,
            cerradaAt: new Date().toISOString(),
            resultado: 'abandonado' as const,
            proximaAccion: '',
            minutos: Math.max(
              0,
              Math.round(
                (Date.now() - new Date(s.creadaAt).getTime()) / 60000
              )
            ),
          }
        : s
    );
  }

  /**
   * Cierra la sala. Si no terminó, la próxima acción es obligatoria: es lo
   * que evita que retomar la tarea mañana signifique reconstruir el contexto
   * entero desde cero.
   */
  function cerrar(
    id: string,
    resultado: SalaResultado,
    proximaAccion: string
  ): { ok: boolean; error?: string } {
    const sala = salas.find((s) => s.id === id);
    if (!sala) return { ok: false, error: 'La sala no existe.' };
    if (sala.cerradaAt) return { ok: false, error: 'La sala ya estaba cerrada.' };
    if (resultado !== 'terminado' && !proximaAccion.trim()) {
      return {
        ok: false,
        error: 'Escribí la próxima acción: es lo que hace fácil retomar.',
      };
    }

    const minutos = Math.max(
      0,
      Math.round((Date.now() - new Date(sala.creadaAt).getTime()) / 60000)
    );

    salas = salas.map((s) =>
      s.id === id
        ? {
            ...s,
            cerradaAt: new Date().toISOString(),
            resultado,
            proximaAccion: proximaAccion.trim(),
            minutos,
          }
        : s
    );
    saveSalas(salas);
    return { ok: true };
  }

  function editarNota(id: string, nota: string) {
    salas = salas.map((s) => (s.id === id ? { ...s, nota } : s));
    saveSalas(salas);
  }

  function borrar(id: string) {
    salas = salas.filter((s) => s.id !== id);
    saveSalas(salas);
  }

  return {
    get salas() { return salas; },
    get activa() { return activa; },
    get historial() { return historial; },
    get constancia() { return constancia; },
    get totalCerradas() { return totalCerradas; },
    get terminadas() { return terminadas; },

    abrir,
    cerrar,
    editarNota,
    borrar,
    /** Tarea del store de tareas que corresponde a la sala, si hay. */
    tareaDe(sala: Sala, tasks: Task[]): Task | null {
      if (!sala.taskId) return null;
      return tasks.find((t) => t.id === sala.taskId) ?? null;
    },
  };
}
