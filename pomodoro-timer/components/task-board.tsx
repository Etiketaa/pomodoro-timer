'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, ListTodo, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Status = 'todo' | 'doing' | 'done'

type Task = {
  id: string
  title: string
  status: Status
}

const COLUMNS: { id: Status; label: string }[] = [
  { id: 'todo', label: 'Por hacer' },
  { id: 'doing', label: 'En proceso' },
  { id: 'done', label: 'Hecho' },
]

const ORDER: Status[] = ['todo', 'doing', 'done']

export function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Terminar el informe semanal', status: 'todo' },
    { id: '2', title: 'Repasar apuntes de diseño', status: 'doing' },
  ])
  const [draft, setDraft] = useState('')
  const [activeTab, setActiveTab] = useState<Status>('todo')

  const addTask = () => {
    const title = draft.trim()
    if (!title) return
    setTasks((t) => [
      ...t,
      { id: crypto.randomUUID(), title, status: 'todo' },
    ])
    setDraft('')
  }

  const move = (id: string, dir: 1 | -1) => {
    setTasks((t) =>
      t.map((task) => {
        if (task.id !== id) return task
        const idx = ORDER.indexOf(task.status)
        const next = ORDER[Math.min(ORDER.length - 1, Math.max(0, idx + dir))]
        return { ...task, status: next }
      }),
    )
  }

  const remove = (id: string) =>
    setTasks((t) => t.filter((task) => task.id !== id))

  const grouped = useMemo(() => {
    return COLUMNS.reduce<Record<Status, Task[]>>(
      (acc, col) => {
        acc[col.id] = tasks.filter((t) => t.status === col.id)
        return acc
      },
      { todo: [], doing: [], done: [] },
    )
  }, [tasks])

  return (
    <section aria-label="Tablero de tareas" className="flex w-full flex-col gap-4">
      {/* Add task */}
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              addTask()
            }
          }}
          placeholder="Añadí una tarea y presioná Enter"
          aria-label="Nueva tarea"
          className="h-11 flex-1 rounded-xl border border-border bg-card/60 px-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
        <button
          onClick={addTask}
          aria-label="Agregar tarea"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile: tab switcher */}
      <div
        role="tablist"
        aria-label="Estado de tareas"
        className="flex items-center gap-1 rounded-full border border-border bg-card/60 p-1 md:hidden"
      >
        {COLUMNS.map((col) => (
          <button
            key={col.id}
            role="tab"
            aria-selected={activeTab === col.id}
            onClick={() => setActiveTab(col.id)}
            className={cn(
              'flex-1 rounded-full px-2 py-2 text-xs font-medium transition-colors',
              activeTab === col.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground',
            )}
          >
            {col.label}
            <span className="ml-1 opacity-70">{grouped[col.id].length}</span>
          </button>
        ))}
      </div>

      {/* Columns: single active on mobile, grid on desktop */}
      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className={cn(
              'flex-col gap-3 rounded-2xl border border-border bg-card/40 p-3',
              activeTab === col.id ? 'flex' : 'hidden',
              'md:flex',
            )}
          >
            <div className="hidden items-center justify-between px-1 md:flex">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {col.label}
              </h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {grouped[col.id].length}
              </span>
            </div>

            {grouped[col.id].length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center">
                <ListTodo className="h-5 w-5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {col.id === 'todo'
                    ? 'Sin tareas aún — añadí una arriba'
                    : 'Nada por acá todavía'}
                </p>
              </div>
            ) : (
              grouped[col.id].map((task) => (
                <article
                  key={task.id}
                  className="group flex items-start gap-2 rounded-xl border border-border bg-card p-3"
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                      task.status === 'done'
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border',
                    )}
                  >
                    {task.status === 'done' && <Check className="h-3 w-3" />}
                  </span>
                  <p
                    className={cn(
                      'flex-1 text-sm leading-relaxed',
                      task.status === 'done' && 'text-muted-foreground line-through',
                    )}
                  >
                    {task.title}
                  </p>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      onClick={() => move(task.id, -1)}
                      disabled={task.status === 'todo'}
                      aria-label="Mover a la etapa anterior"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => move(task.id, 1)}
                      disabled={task.status === 'done'}
                      aria-label="Mover a la etapa siguiente"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(task.id)}
                      aria-label="Eliminar tarea"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
