import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState } from '@/components/dashboard/EmptyState'

describe('EmptyState', () => {
  it('mostra incentivo e botão para criar hábito', async () => {
    const onCreate = jest.fn()
    const user = userEvent.setup()
    render(<EmptyState onCreate={onCreate} />)

    expect(screen.getByText('Nenhum hábito ainda')).toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'Criar meu primeiro hábito' })
    await user.click(button)
    expect(onCreate).toHaveBeenCalledTimes(1)
  })
})