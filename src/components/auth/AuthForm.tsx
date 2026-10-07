'use client'

import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { apiFetch, ApiClientError } from '@/lib/apiClient'

export type AuthMode = 'login' | 'register'

export interface AuthFormProps {
  mode: AuthMode
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const isRegister = mode === 'register'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()
      setFormError(null)

      const errors: Record<string, string> = {}
      if (isRegister && !name.trim()) errors.name = 'Informe seu nome'
      if (!EMAIL_RE.test(email)) errors.email = 'Informe um e-mail válido'
      if (password.length < 6) errors.password = 'Mínimo de 6 caracteres'
      setFieldErrors(errors)
      if (Object.keys(errors).length > 0) return

      setLoading(true)
      try {
        await apiFetch(`/api/auth/${isRegister ? 'register' : 'login'}`, {
          method: 'POST',
          body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
        })
        router.push('/')
        router.refresh()
      } catch (cause) {
        setFormError(cause instanceof ApiClientError ? cause.message : 'Não foi possível entrar')
      } finally {
        setLoading(false)
      }
    },
    [isRegister, name, email, password, router]
  )

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {isRegister ? (
        <Input
          name="name"
          label="Nome"
          placeholder="Como você quer ser chamado?"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
          autoComplete="name"
        />
      ) : null}
      <Input
        name="email"
        label="E-mail"
        type="email"
        inputMode="email"
        placeholder="voce@exemplo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
        autoComplete="email"
      />
      <Input
        name="password"
        label="Senha"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
        autoComplete={isRegister ? 'new-password' : 'current-password'}
      />

      {formError ? (
        <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {formError}
        </p>
      ) : null}

      <Button type="submit" loading={loading} fullWidth className="mt-1">
        {isRegister ? 'Criar conta' : 'Entrar'}
      </Button>

      <p className="text-center text-sm text-stone-500">
        {isRegister ? 'Já tem uma conta?' : 'Ainda não tem conta?'}{' '}
        <Link
          href={isRegister ? '/login' : '/register'}
          className="font-medium text-brand-700 hover:underline"
        >
          {isRegister ? 'Entrar' : 'Cadastre-se'}
        </Link>
      </p>
    </form>
  )
}