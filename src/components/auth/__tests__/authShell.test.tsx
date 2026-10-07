import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AuthShell } from '@/components/auth/AuthShell'

const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

jest.mock('next/link', () => {
  return function MockLink({
    href,
    children,
    ...rest
  }: {
    href: string
    children: ReactNode
  }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    )
  }
})

describe('AuthShell', () => {
  it('exibe a marca HabitTrack e o formulário de login', () => {
    render(<AuthShell mode="login" />)
    expect(screen.getByText('HabitTrack')).toBeInTheDocument()
    expect(screen.getByText('Bem-vindo de volta! Continue seus hábitos.')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
  })

  it('exibe o texto de cadastro no modo register', () => {
    render(<AuthShell mode="register" />)
    expect(screen.getByText('Crie sua conta e comece a construir hábitos.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeInTheDocument()
  })
})