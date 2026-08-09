'use client'

import { useState } from 'react'
import { Download, X } from 'lucide-react'

export function InstallBanner() {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-2.5 rounded-full border border-border bg-card/95 py-2 pl-3 pr-2 shadow-xl shadow-black/30 backdrop-blur">
        <Download className="h-4 w-4 shrink-0 text-primary" />
        <p className="min-w-0 flex-1 truncate text-sm">
          <span className="font-medium">Instalá la app</span>{' '}
          <span className="text-muted-foreground">para acceso rápido</span>
        </p>
        <button className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          Instalar
        </button>
        <button
          onClick={() => setVisible(false)}
          aria-label="Descartar"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
