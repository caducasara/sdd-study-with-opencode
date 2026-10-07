import bcrypt from 'bcryptjs'
import * as userRepository from '@/lib/repositories/userRepository'
import { login, register } from '@/lib/services/authService'

jest.mock('@/lib/repositories/userRepository', () => ({
  create: jest.fn(),
  findByEmail: jest.fn(),
  findById: jest.fn(),
}))

const mockedUsers = userRepository as jest.Mocked<typeof userRepository>

beforeEach(() => {
  jest.resetAllMocks()
})

describe('register', () => {
  it('cria o usuário com senha hasheada', async () => {
    mockedUsers.findByEmail.mockResolvedValue(null)
    mockedUsers.create.mockResolvedValue({
      id: 'u1',
      name: 'Ana',
      email: 'ana@example.com',
      passwordHash: 'hash',
      createdAt: '2026-10-06T00:00:00.000Z',
    })

    const user = await register({ name: ' Ana ', email: 'ANA@Example.com', password: 'senha123' })

    expect(mockedUsers.findByEmail).toHaveBeenCalledWith('ana@example.com')
    const input = mockedUsers.create.mock.calls[0][0]
    expect(input.email).toBe('ana@example.com')
    expect(input.name).toBe('Ana')
    expect(input.passwordHash).not.toBe('senha123')
    await expect(bcrypt.compare('senha123', input.passwordHash)).resolves.toBe(true)
    expect(user.email).toBe('ana@example.com')
  })

  it('rejeita nome vazio', async () => {
    await expect(
      register({ name: '  ', email: 'a@b.com', password: 'senha123' })
    ).rejects.toMatchObject({ status: 400 })
    expect(mockedUsers.create).not.toHaveBeenCalled()
  })

  it('rejeita e-mail inválido', async () => {
    await expect(
      register({ name: 'Ana', email: 'nao-e-email', password: 'senha123' })
    ).rejects.toMatchObject({ status: 400 })
  })

  it('rejeita senha curta', async () => {
    await expect(register({ name: 'Ana', email: 'a@b.com', password: '123' })).rejects.toMatchObject(
      { status: 400 }
    )
  })

  it('rejeita e-mail já cadastrado', async () => {
    mockedUsers.findByEmail.mockResolvedValue({
      id: 'u1',
      name: 'Ana',
      email: 'ana@example.com',
      passwordHash: 'hash',
      createdAt: '2026-10-06T00:00:00.000Z',
    })

    await expect(
      register({ name: 'Ana', email: 'ana@example.com', password: 'senha123' })
    ).rejects.toMatchObject({ status: 409 })
    expect(mockedUsers.create).not.toHaveBeenCalled()
  })
})

describe('login', () => {
  const user = {
    id: 'u1',
    name: 'Ana',
    email: 'ana@example.com',
    passwordHash: '',
    createdAt: '2026-10-06T00:00:00.000Z',
  }

  it('autentica com credenciais corretas', async () => {
    const hash = await bcrypt.hash('senha123', 4)
    mockedUsers.findByEmail.mockResolvedValue({ ...user, passwordHash: hash })

    const logged = await login({ email: 'ANA@example.com ', password: 'senha123' })

    expect(logged.id).toBe('u1')
    expect(mockedUsers.findByEmail).toHaveBeenCalledWith('ana@example.com')
  })

  it('falha com e-mail inexistente', async () => {
    mockedUsers.findByEmail.mockResolvedValue(null)
    await expect(login({ email: 'x@y.com', password: 'senha123' })).rejects.toMatchObject({
      status: 401,
    })
  })

  it('falha com senha incorreta', async () => {
    const hash = await bcrypt.hash('senha123', 4)
    mockedUsers.findByEmail.mockResolvedValue({ ...user, passwordHash: hash })
    await expect(login({ email: 'ana@example.com', password: 'errada' })).rejects.toMatchObject({
      status: 401,
    })
  })
})
