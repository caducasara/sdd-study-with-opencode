import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

describe('Button', () => {
  it('renderiza filhos e dispara onClick', async () => {
    const onClick = jest.fn()
    const user = userEvent.setup()
    render(<Button onClick={onClick}>Salvar</Button>)

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('fica disabled durante loading e exibe spinner', () => {
    render(<Button loading>Só um momento</Button>)
    const button = screen.getByRole('button', { name: /só um momento/i })
    expect(button).toBeDisabled()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('aplica fullWidth', () => {
    render(<Button fullWidth>Largo</Button>)
    expect(screen.getByRole('button', { name: 'Largo' })).toHaveClass('w-full')
  })

  it('respeita disabled explícito', () => {
    render(<Button disabled>Bloqueado</Button>)
    expect(screen.getByRole('button', { name: 'Bloqueado' })).toBeDisabled()
  })

  it('suporta variantes e tamanhos sem quebrar', () => {
    const { rerender } = render(
      <Button variant="secondary" size="sm">
        Secundário
      </Button>
    )
    expect(screen.getByRole('button', { name: 'Secundário' })).toHaveClass('ring-stone-200')
    rerender(
      <Button variant="danger" size="lg">
        Perigo
      </Button>
    )
    expect(screen.getByRole('button', { name: 'Perigo' })).toHaveClass('bg-red-600')
    rerender(
      <Button variant="ghost">
        Fantasma
      </Button>
    )
    expect(screen.getByRole('button', { name: 'Fantasma' })).toHaveClass('text-brand-700')
  })

  it('usa type padrão button', () => {
    render(<Button>OK</Button>)
    expect(screen.getByRole('button', { name: 'OK' })).toHaveAttribute('type', 'button')
  })
})

describe('Input', () => {
  it('renderiza label, value e callback de mudança', async () => {
    const onChange = jest.fn()
    const user = userEvent.setup()
    render(<Input label="Nome" name="nome" value="" onChange={onChange} placeholder="Digite" />)

    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Nome'), 'Ana')
    expect(onChange).toHaveBeenCalled()
  })

  it('liga o label ao input pelo id quando fornecido', () => {
    render(<Input label="E-mail" name="email" id="campo-email" />)
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('id', 'campo-email')
  })

  it('exibe erro e marca aria-invalid', () => {
    render(<Input label="Senha" name="senha" error="Mínimo de 6 caracteres" />)
    expect(screen.getByText('Mínimo de 6 caracteres')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-invalid', 'true')
  })

  it('exibe hint quando não há erro', () => {
    render(<Input label="Nome" name="nome" hint="Como quer ser chamado" />)
    expect(screen.getByText('Como quer ser chamado')).toBeInTheDocument()
  })
})

describe('Textarea', () => {
  it('renderiza com label e texto', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(<Textarea label="Descrição" name="desc" value="" onChange={onChange} />)

    const area = screen.getByLabelText('Descrição')
    expect(area.tagName).toBe('TEXTAREA')
    await user.type(area, 'Detalhes')
    expect(onChange).toHaveBeenCalled()
  })

  it('exibe erro', () => {
    render(<Textarea label="Descrição" name="desc" error="Texto longo demais" />)
    expect(screen.getByText('Texto longo demais')).toBeInTheDocument()
  })
})

describe('Card', () => {
  it('renderiza o conteúdo', () => {
    render(<Card>Conteúdo do card</Card>)
    expect(screen.getByText('Conteúdo do card')).toBeInTheDocument()
  })

  it('aceita estilo interativo', () => {
    render(<Card interactive>Clickável</Card>)
    expect(screen.getByText('Clickável')).toHaveClass('hover:shadow-md')
  })
})

describe('Skeleton', () => {
  it('é decorativo (aria-hidden)', () => {
    const { container } = render(<Skeleton className="h-10" />)
    const el = container.querySelector('.animate-pulse') as HTMLElement
    expect(el).toHaveAttribute('aria-hidden', 'true')
    expect(el).toHaveClass('h-10')
  })
})