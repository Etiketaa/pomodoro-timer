import { InstallBanner } from '@/components/install-banner'
import { LofiPlayer } from '@/components/lofi-player'
import { PomodoroTimer } from '@/components/pomodoro-timer'
import { SiteHeader } from '@/components/site-header'
import { TaskBoard } from '@/components/task-board'

export default function AppPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-4 pb-40 pt-6 md:pb-28">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_1fr] lg:gap-10">
          {/* Focus column */}
          <div className="flex flex-col gap-5 lg:sticky lg:top-20 lg:self-start">
            <PomodoroTimer />
            <LofiPlayer />
          </div>

          {/* Tasks column */}
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-lg font-semibold text-balance">
                Tu sesión de trabajo
              </h1>
              <p className="text-sm text-muted-foreground text-pretty">
                Organizá tus tareas mientras el temporizador corre. Arrastrá
                cada tarea entre etapas con las flechas.
              </p>
            </div>
            <TaskBoard />
          </div>
        </div>
      </main>

      <InstallBanner />
    </div>
  )
}
