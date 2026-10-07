import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import LoginPage from '@/app/login/page'
import RegisterPage from '@/app/register/page'

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

describe('Páginas de autenticação', () => {
  it('LoginPage renderiza o shell de login', () => {
    render(<LoginPage />)
    expect(screen.getByText('HabitTrack')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
  })

  it('RegisterPage renderiza o shell de cadastro', () => {
    render(<RegisterPage />)
    expect(screen.getByText('HabitTrack')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
  })
})