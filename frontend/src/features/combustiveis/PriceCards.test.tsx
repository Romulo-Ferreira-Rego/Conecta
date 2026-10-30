import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { resumo, SERIE_VAZIA } from '../../test/fixtures'
import { mockApi, renderWithProviders } from '../../test/render'
import { PriceCards } from './PriceCards'
import { TrendBadge } from './TrendBadge'

describe('cards de preço', () => {
  it('mostra os 4 combustíveis com preço e variação com seta e sinal', async () => {
    mockApi({
      '/resumo': [
        resumo('gasolina', { preco_medio: 6.56, variacao_percentual: -0.2 }),
        resumo('etanol', { preco_medio: 4.32, variacao_percentual: 1.7 }),
        resumo('diesel-s10', { preco_medio: 7.17, variacao_percentual: 3.3 }),
      ],
      '/serie': SERIE_VAZIA,
    })
    renderWithProviders(<PriceCards />)

    const gasolina = await screen.findByRole('button', { name: /Gasolina/ })
    // O Testing Library normaliza o espaço inseparável de "R$ 6,56" para um espaço comum
    expect(within(gasolina).getAllByText(/R\$\s6,56/).length).toBeGreaterThan(0)
    expect(within(gasolina).getByText('−0,2%')).toBeInTheDocument()
    expect(within(gasolina).getByText('(queda)')).toBeInTheDocument()

    const etanol = screen.getByRole('button', { name: /Etanol/ })
    expect(within(etanol).getByText('+1,7%')).toBeInTheDocument()
    expect(within(etanol).getByText('(alta)')).toBeInTheDocument()

    // GNV sem dados para o filtro
    const gnv = screen.getByRole('button', { name: /GNV/ })
    expect(within(gnv).getByText('Sem coletas para este filtro')).toBeInTheDocument()
  })

  it('clicar num card troca o combustível do painel (na URL)', async () => {
    mockApi({ '/resumo': [resumo('gasolina'), resumo('etanol')], '/serie': SERIE_VAZIA })
    renderWithProviders(<PriceCards />, { url: '/?uf=MA' })

    const etanol = await screen.findByRole('button', { name: /Etanol/ })
    expect(screen.getByRole('button', { name: /Gasolina/ })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(etanol)

    expect(screen.getByTestId('url')).toHaveTextContent('?produto=etanol&uf=MA')
    expect(etanol).toHaveAttribute('aria-pressed', 'true')
  })

  it('mostra erro com opção de tentar de novo quando a API falha', async () => {
    const fetchMock = mockApi({ '/resumo': 'erro' })
    renderWithProviders(<PriceCards />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar')
    const chamadas = fetchMock.mock.calls.length
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(chamadas))
  })
})

describe('indicador de variação', () => {
  it('nunca depende só da cor: tem seta, sinal e texto para leitor de tela', () => {
    const { container } = renderWithProviders(<TrendBadge percent={2.5} />)
    expect(container).toHaveTextContent('▲')
    expect(container).toHaveTextContent('+2,5%')
    expect(container).toHaveTextContent('(alta)')
  })

  it('mostra estabilidade sem seta de alta ou queda', () => {
    const { container } = renderWithProviders(<TrendBadge percent={0.02} />)
    expect(container).toHaveTextContent('0,0%')
    expect(container).toHaveTextContent('(estável)')
  })
})
