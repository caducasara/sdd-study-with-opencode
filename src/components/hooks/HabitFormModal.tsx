'use client'

import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { apiFetch, ApiClientError } from '@/lib/apiClient'
import type { HabitSummary } from '@/types'

export interface HabitFormModalProps {
  open: boolean
  onClose: () => void
  onCreated: (habit: HabitSummary) => void
}

export function HabitFormModal({ open, onClose, onCreated }: HabitFormModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Reinicia os campos quando o modal é (re)aberto, ajustando o estado durante o render.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setName('')
      setDescription('')
      setError(null)
    }
  }

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()
      const trimmed = name.trim()
      if (!trimmed) {
        setError('Informe um nome para o hábito')
        return
      }
      setLoading(true)
      setError(null)
      try {
        const habit = await apiFetch<HabitSummary>('/api/habits', {
          method: 'POST',
          body: JSON.stringify({ name: trimmed, description: description.trim() }),
        })
        onCreated(habit)
        onClose()
      } catch (cause) {
        setError(cause instanceof ApiClientError ? cause.message : 'Não foi possível criar o hábito')
      } finally {
        setLoading(false)
      }
    },
    [name, description, onCreated, onClose]
  )

  return (
    <Modal open={open} onClose={onClose} title="Novo hábito">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          name="name"
          label="Nome"
          placeholder="Ex.: Beber 2L de água"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error ?? undefined}
          autoFocus
          maxLength={100}
        />
        <Textarea
          name="description"
          label="Descrição (opcional)"
          placeholder="Um lembrete ajuda a manter o foco..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={300}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Criar hábito
          </Button>
        </div>
      </form>
    </Modal>
  )
}