'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'

type Mode = 'focus' | 'short' | 'long'

const MODES: { id: Mode; label: string; minutes: number }[] = [
  { id: 'focus', label: 'Enfoque', minutes: 25 },
  { id: 'short', label: 'Descanso corto', minutes: 5 },
  { id: 'long', label: 'Descanso largo', minutes: 15 },
]

const CYCLES_BEFORE_LONG = 4

function format(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')
  return `${m}:${s}`
}

/** Short chime using the Web Audio API — no external asset needed. */
function playChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    const ctx = new Ctx()
    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99] // C5 E5 G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = now + i * 0.16
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.95)
    })
    setTimeout(() => ctx.close(), 2000)
  } catch {
    /* audio not available */
  }
}

export function PomodoroTimer() {
  const [mode, setMode] = useState<Mode>('focus')
  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(0)

  const total = useMemo(
    () => (MODES.find((m) => m.id === mode)?.minutes ?? 25) * 60,
    [mode],
  )
  const [remaining, setRemaining] = useState(total)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completedRef = useRef(0)

  const setModeTime = useCallback((next: Mode, autostart = false) => {
    setMode(next)
    const mins = MODES.find((m) => m.id === next)?.minutes ?? 25
    setRemaining(mins * 60)
    setRunning(autostart)
  }, [])

  const switchMode = useCallback(
    (next: Mode) => {
      setModeTime(next)
    },
    [setModeTime],
  )

  const reset = useCallback(() => {
    setRunning(false)
    setRemaining(total)
  }, [total])

  // Countdown + completion handling (auto-advance focus -> break).
  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r > 1) return r - 1
        // reached zero
        playChime()
        if (mode === 'focus') {
          const next = completedRef.current + 1
          completedRef.current = next
          setCompleted(next)
          const goLong = next % CYCLES_BEFORE_LONG === 0
          setModeTime(goLong ? 'long' : 'short', true)
        } else {
          setModeTime('focus', true)
        }
        return 0
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, mode, setModeTime])

  // Keep the tab title in sync so it works when backgrounded.
  useEffect(() => {
    const label = MODES.find((m) => m.id === mode)?.label ?? ''
    document.title = running
      ? `${format(remaining)} · ${label}`
      : 'Lofi Pomodoro'
    return () => {
      document.title = 'Lofi Pomodoro'
    }
  }, [remaining, running, mode])

  // Spacebar toggles play/pause (ignoring typing in inputs).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA') return
      if (e.code === 'Space') {
        e.preventDefault()
        setRunning((r) => !r)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const progress = 1 - remaining / total
  const R = 120
  const circumference = 2 * Math.PI * R

  return (
    <section
      aria-label="Temporizador Pomodoro"
      className="flex w-full flex-col items-center gap-6"
    >
      {/* Mode tabs */}
      <div
        role="tablist"
        aria-label="Modo del temporizador"
        className="flex w-full max-w-sm items-center gap-1 rounded-full border border-border bg-card/60 p-1 backdrop-blur"
      >
        {MODES.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => switchMode(m.id)}
            className={cn(
              'flex-1 rounded-full px-3 py-2 text-xs font-medium transition-colors sm:text-sm',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              mode === m.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Ring */}
      <div className="relative aspect-square w-full max-w-[300px]">
        {/* soft glow behind the ring while running */}
        <div
          aria-hidden
          className={cn(
            'absolute inset-6 rounded-full bg-primary/10 blur-2xl transition-opacity duration-700',
            running ? 'opacity-100' : 'opacity-0',
          )}
        />
        <svg viewBox="0 0 280 280" className="h-full w-full -rotate-90">
          <circle
            cx="140"
            cy="140"
            r={R}
            fill="none"
            stroke="var(--border)"
            strokeWidth="14"
          />
          <circle
            cx="140"
            cy="140"
            r={R}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            style={{ filter: 'drop-shadow(0 0 12px color-mix(in oklch, var(--primary) 60%, transparent))' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {MODES.find((m) => m.id === mode)?.label}
          </span>
          <span className="font-mono text-5xl font-semibold tabular-nums sm:text-6xl">
            {format(remaining)}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            {completed} {completed === 1 ? 'sesión' : 'sesiones'} de enfoque
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          aria-label="Reiniciar temporizador"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
        <button
          onClick={() => setRunning((r) => !r)}
          aria-label={running ? 'Pausar' : 'Iniciar'}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {running ? (
            <Pause className="h-7 w-7" />
          ) : (
            <Play className="ml-0.5 h-7 w-7" />
          )}
        </button>
        <button
          onClick={() => {
            const idx = MODES.findIndex((m) => m.id === mode)
            switchMode(MODES[(idx + 1) % MODES.length].id)
          }}
          aria-label="Siguiente modo"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <SkipForward className="h-5 w-5" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Presioná{' '}
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
          Espacio
        </kbd>{' '}
        para iniciar o pausar
      </p>
    </section>
  )
}
