import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from '@/components/ui/Modal'

describe('Modal', () => {
  it('não renderiza nada quando fechado', () => {
    render(
      <Modal open={false} onClose={jest.fn()} title="Título">
        Conteúdo
      </Modal>
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renderiza título e conteúdo quando aberto', () => {
    render(
      <Modal open onClose={jest.fn()} title="Novo hábito">
        <p>Conteúdo do modal</p>
      </Modal>
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Novo hábito')).toBeInTheDocument()
    expect(screen.getByText('Conteúdo do modal')).toBeInTheDocument()
  })

  it('fecha ao clicar no botão de fechar', async () => {
    const onClose = jest.fn()
    const user = userEvent.setup()
    render(
      <Modal open onClose={onClose} title="Título">
        Conteúdo
      </Modal>
    )

    await user.click(screen.getByRole('button', { name: 'Fechar janela' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('fecha com a tecla Escape', async () => {
    const onClose = jest.fn()
    const user = userEvent.setup()
    render(
      <Modal open onClose={onClose} title="Título">
        Conteúdo
      </Modal>
    )

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('fecha ao clicar no backdrop', async () => {
    const onClose = jest.fn()
    const user = userEvent.setup()
    render(
      <Modal open onClose={onClose} title="Título">
        Conteúdo
      </Modal>
    )

    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('trava o scroll do body enquanto aberto', () => {
    const { rerender } = render(
      <Modal open onClose={jest.fn()} title="Título">
        Conteúdo
      </Modal>
    )
    expect(document.body.style.overflow).toBe('hidden')

    rerender(
      <Modal open={false} onClose={jest.fn()} title="Título">
        Conteúdo
      </Modal>
    )
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})