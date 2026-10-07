'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/apiClient'
import type { SessionUser } from '@/types'

export interface UseSessionResult {
  user: SessionUser | null
  loading: boolean
}

export function useSession(): UseSessionResult {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    apiFetch<{ user: SessionUser | null }>('/api/auth/session')
      .then((data) => {
        if (active) setUser(data.user)
      })
      .catch(() => {
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { user, loading }
}