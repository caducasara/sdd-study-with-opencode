import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from '@/components/ui/Toast'

function ToastButton({ message, type }: { message: string; type?: 'success' | 'error' | 'info' }) {
  const { showToast } = useToast()
  return <button onClick={() => showToast(message, type)}>mostrar</button>
}

function renderWithToast(message: string, type?: 'success' | 'error' | 'info') {
  return render(
    <ToastProvider>
      <ToastButton message={message} type={type} />
    </ToastProvider>
  )
}

describe('ToastProvider', () => {
  it('mostra uma mensagem ao chamar showToast', async () => {
    const user = userEvent.setup()
    renderWithToast('Hábito criado!', 'success')

    await user.click(screen.getByRole('button', { name: 'mostrar' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Hábito criado!')
  })

  it('remove a mensagem ao clicar no botão de fechar', async () => {
    const user = userEvent.setup()
    renderWithToast('Aviso importante')

    await user.click(screen.getByRole('button', { name: 'mostrar' }))
    const toast = await screen.findByRole('status')
    await user.click(screen.getByRole('button', { name: 'Fechar aviso' }))
    expect(toast).not.toBeInTheDocument()
  })

  it('dispensa automaticamente após 3 segundos', async () => {
    jest.useFakeTimers()
    try {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      renderWithToast('Temporário')

      await user.click(screen.getByRole('button', { name: 'mostrar' }))
      expect(await screen.findByRole('status')).toBeInTheDocument()

      act(() => {
        jest.advanceTimersByTime(3000)
      })
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    } finally {
      jest.useRealTimers()
    }
  })

  it('suporta múltiplos toasts', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <ToastButton message="Um" />
        <ToastButton message="Dois" />
      </ToastProvider>
    )

    await user.click(screen.getAllByRole('button', { name: 'mostrar' })[0])
    await user.click(screen.getAllByRole('button', { name: 'mostrar' })[1])
    expect(await screen.findAllByRole('status')).toHaveLength(2)
  })
})

describe('useToast', () => {
  it('lança erro fora do provider', () => {
    const originalError = console.error
    console.error = jest.fn()
    try {
      expect(() => render(<ToastButton message="x" />)).toThrow(/ToastProvider/)
    } finally {
      console.error = originalError
    }
  })
})