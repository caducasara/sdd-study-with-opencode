import { AuthForm } from '@/components/auth/AuthForm'
import type { AuthMode } from '@/components/auth/AuthForm'

export interface AuthShellProps {
  mode: AuthMode
}

export function AuthShell({ mode }: AuthShellProps) {
  const isRegister = mode === 'register'
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 animate-fade-in">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl shadow-lg shadow-brand-600/30">
            🔥
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">HabitTrack</h1>
          <p className="mt-1 text-sm text-stone-500">
            {isRegister
              ? 'Crie sua conta e comece a construir hábitos.'
              : 'Bem-vindo de volta! Continue seus hábitos.'}
          </p>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200/70">
          <AuthForm mode={mode} />
        </div>
      </div>
    </main>
  )
}