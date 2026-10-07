'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons: Record<ToastType, string> = {
  success: '✅',
  error: '⚠️',
  info: '💡',
}

const ring: Record<ToastType, string> = {
  success: 'ring-emerald-200',
  error: 'ring-red-200',
  info: 'ring-brand-200',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      nextId.current += 1
      const id = nextId.current
      setToasts((current) => [...current, { id, message, type }])
      window.setTimeout(() => dismiss(id), 3000)
    },
    [dismiss]
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-lg ring-1 animate-fade-up ${ring[toast.type]}`}
          >
            <span aria-hidden>{icons[toast.type]}</span>
            <span className="text-sm text-stone-800">{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              aria-label="Fechar aviso"
              className="touch-target -mr-1 ml-auto flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return context
}