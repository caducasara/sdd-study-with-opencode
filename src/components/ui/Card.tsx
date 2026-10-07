import type { ReactNode } from 'react'

export function Card({
  children,
  className = '',
  interactive = false,
}: {
  children: ReactNode
  className?: string
  interactive?: boolean
}) {
  return (
    <div
      className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200/70 ${interactive ? 'transition hover:shadow-md' : ''} ${className}`}
    >
      {children}
    </div>
  )
}