'use client'

import { useState } from 'react'
import { Bell, Menu, Timer, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <a href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Timer className="h-4 w-4" />
          </span>
          <span className="text-sm">Lofi Pomodoro</span>
        </a>

        {/* Desktop actions */}
        <nav className="hidden items-center gap-1 sm:flex">
          <button
            aria-label="Notificaciones"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Bell className="h-4 w-4" />
          </button>
          <button className="ml-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Entrar
          </button>
        </nav>

        {/* Mobile: single menu button */}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      <div
        className={cn(
          'grid overflow-hidden border-t border-border transition-all sm:hidden',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] border-t-0',
        )}
      >
        <div className="min-h-0">
          <nav className="flex flex-col gap-1 p-4">
            <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
              <Bell className="h-4 w-4" /> Notificaciones
            </button>
            <button className="mt-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
              Entrar
            </button>
          </nav>
        </div>
      </div>
    </header>
  )
}
