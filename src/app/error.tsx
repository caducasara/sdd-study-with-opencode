'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center animate-fade-in">
      <p className="text-6xl" aria-hidden>
        ⚠️
      </p>
      <h1 className="text-2xl font-bold text-stone-900">Algo deu errado</h1>
      <p className="text-stone-500">{error.message || 'Ocorreu um erro inesperado.'}</p>
      <button
        onClick={reset}
        className="mt-2 inline-flex h-11 items-center rounded-xl bg-brand-600 px-5 font-medium text-white shadow-sm transition hover:bg-brand-700"
      >
        Tentar novamente
      </button>
    </main>
  )
}