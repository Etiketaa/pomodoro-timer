'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Pause, Play, Radio, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'

// SomaFM "Groove Salad" — free, downtempo/ambient stream that works well as
// focus background music. Streaming via a plain <audio> element needs no CORS.
const STREAM_URL = 'https://ice1.somafm.com/groovesalad-128-mp3'

export function LofiPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [volume, setVolume] = useState(60)
  const [muted, setMuted] = useState(false)

  // Sync volume/mute to the audio element.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume / 100
    }
  }, [volume, muted])

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }
    try {
      setLoading(true)
      // Reset the source so a paused live stream reconnects to "now".
      audio.src = STREAM_URL
      audio.volume = muted ? 0 : volume / 100
      await audio.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/70 p-3 backdrop-blur">
      <audio
        ref={audioRef}
        preload="none"
        onPlaying={() => {
          setLoading(false)
          setPlaying(true)
        }}
        onPause={() => setPlaying(false)}
        onWaiting={() => setLoading(true)}
      />

      <button
        onClick={toggle}
        aria-label={playing ? 'Pausar radio' : 'Reproducir radio'}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : playing ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="ml-0.5 h-5 w-5" />
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Radio
            className={cn(
              'h-3.5 w-3.5 shrink-0',
              playing ? 'text-primary' : 'text-muted-foreground',
            )}
          />
          <span className="truncate">SomaFM · Groove Salad</span>
        </div>
        <span className="truncate text-xs text-muted-foreground">
          {loading
            ? 'Conectando…'
            : playing
              ? 'En vivo · beats para concentrarte'
              : 'Pausado'}
        </span>
      </div>

      {/* Volume — hidden on the smallest screens, mute toggle always available */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'Activar sonido' : 'Silenciar'}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {muted || volume === 0 ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={muted ? 0 : volume}
          onChange={(e) => {
            setVolume(Number(e.target.value))
            setMuted(false)
          }}
          aria-label="Volumen"
          className="hidden h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-muted accent-primary sm:block"
        />
      </div>
    </div>
  )
}
