'use client'

import { useEffect, useId } from 'react'
import type { ReactNode } from 'react'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        aria-label="Fechar"
        className="absolute inset-0 bg-stone-900/40 animate-fade-in"
        onClick={onClose}
        tabIndex={-1}
      />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-5 shadow-xl animate-fade-up sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold text-stone-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar janela"
            className="touch-target -mr-2 flex h-10 w-10 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}