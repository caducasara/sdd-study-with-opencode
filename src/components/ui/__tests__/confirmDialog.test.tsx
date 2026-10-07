import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renderiza mensagem e botões de ação', () => {
    render(
      <ConfirmDialog
        open
        title="Excluir hábito"
        message="Tem certeza?"
        confirmLabel="Excluir"
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Tem certeza?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })

  it('chama onConfirm', async () => {
    const onConfirm = jest.fn()
    const user = userEvent.setup()
    render(
      <ConfirmDialog
        open
        title="Excluir"
        message="Confirma?"
        confirmLabel="Sim"
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Sim' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('chama onClose ao cancelar', async () => {
    const onClose = jest.fn()
    const user = userEvent.setup()
    render(
      <ConfirmDialog
        open
        title="Excluir"
        message="Confirma?"
        confirmLabel="Sim"
        onConfirm={jest.fn()}
        onClose={onClose}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('desabilita o botão durante a ação', () => {
    render(
      <ConfirmDialog
        open
        title="Excluir"
        message="Confirma?"
        confirmLabel="Sim"
        busy
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /sim/i })).toBeDisabled()
  })
})