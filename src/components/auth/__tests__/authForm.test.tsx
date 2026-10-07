import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { AuthForm } from '@/components/auth/AuthForm'
import {
  dataEnvelope,
  errorEnvelope,
  fetchOnce,
  setFetchMock,
} from '@/__tests__/helpers'

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

beforeEach(() => {
  jest.clearAllMocks()
})

describe('AuthForm no modo login', () => {
  it('exibe apenas e-mail e senha', () => {
    render(<AuthForm mode="login" />)
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('valida campos vazios sem chamar a API', async () => {
    const fetchMock = fetchOnce(dataEnvelope({}))
    const user = userEvent.setup()
    render(<AuthForm mode="login" />)

    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Informe um e-mail válido')).toBeInTheDocument()
    expect(screen.getByText('Mínimo de 6 caracteres')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('valida e-mail com formato inválido', async () => {
    const user = userEvent.setup()
    render(<AuthForm mode="login" />)

    await user.type(screen.getByLabelText('E-mail'), 'sem-arroba')
    await user.type(screen.getByLabelText('Senha'), '123456')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Informe um e-mail válido')).toBeInTheDocument()
  })

  it('faz login com sucesso e navega para o dashboard', async () => {
    const fetchMock = fetchOnce(dataEnvelope({ user: { id: 'u1' } }))
    const user = userEvent.setup()
    render(<AuthForm mode="login" />)

    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com')
    await user.type(screen.getByLabelText('Senha'), 'segredo1')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'))
    expect(mockRefresh).toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: '', email: 'ana@example.com', password: 'segredo1' }),
      })
    )
  })

  it('exibe a mensagem de erro da API em caso de falha', async () => {
    fetchOnce(errorEnvelope(401, 'E-mail ou senha incorretos'), 401)
    const user = userEvent.setup()
    render(<AuthForm mode="login" />)

    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com')
    await user.type(screen.getByLabelText('Senha'), 'errada')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('E-mail ou senha incorretos')).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('exibe a mensagem de falha de conexão em erro de rede', async () => {
    setFetchMock(jest.fn().mockRejectedValue(new TypeError('network')))
    const user = userEvent.setup()
    render(<AuthForm mode="login" />)

    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com')
    await user.type(screen.getByLabelText('Senha'), 'segredo1')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Falha de conexão. Tente novamente.')).toBeInTheDocument()
  })

  it('links para a tela de cadastro', async () => {
    render(<AuthForm mode="login" />)
    expect(screen.getByRole('link', { name: 'Cadastre-se' })).toHaveAttribute(
      'href',
      '/register'
    )
  })
})

describe('AuthForm no modo register', () => {
  it('exibe o campo nome e cria a conta', async () => {
    const fetchMock = fetchOnce(dataEnvelope({ user: { id: 'u1' } }), 201)
    const user = userEvent.setup()
    render(<AuthForm mode="register" />)

    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Nome'), 'Ana Souza')
    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com')
    await user.type(screen.getByLabelText('Senha'), 'segredo1')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/register',
      expect.objectContaining({
        body: JSON.stringify({ name: 'Ana Souza', email: 'ana@example.com', password: 'segredo1' }),
      })
    )
  })

  it('valida nome obrigatório', async () => {
    const fetchMock = fetchOnce(dataEnvelope({}))
    const user = userEvent.setup()
    render(<AuthForm mode="register" />)

    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com')
    await user.type(screen.getByLabelText('Senha'), 'segredo1')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('Informe seu nome')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('usa autocomplete new-password no cadastro', () => {
    render(<AuthForm mode="register" />)
    expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'new-password')
  })
})