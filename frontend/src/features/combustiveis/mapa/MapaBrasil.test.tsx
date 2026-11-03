import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import brasil from '../../../../public/mapas/brasil.json'
import municipiosMA from '../../../../public/mapas/municipios/MA.json'
import type { AreaMapa, Mapa } from '../../../api/types'
import { mockApi, renderWithProviders } from '../../../test/render'
import { MapaBrasil } from './MapaBrasil'

function area(overrides: Partial<AreaMapa>): AreaMapa {
  return {
    uf: 'MA',
    nome: 'Maranhão',
    municipio_id: null,
    codigo_ibge: null,
    preco_medio: 6.3,
    qtd_coletas: 300,
    preco_anterior: 6.4,
    variacao_percentual: -1.56,
    ...overrides,
  }
}

function mapa(uf: string | null, itens: AreaMapa[]): Mapa {
  return {
    produto: 'gasolina',
    unidade: 'R$ / litro',
    nivel: uf ? 'municipio' : 'uf',
    uf,
    mes: '2026-09-01',
    mes_anterior: '2026-08-01',
    min_coletas: 10,
    itens,
  }
}

const POR_UF = mapa(null, [
  area({}),
  area({ uf: 'SP', nome: 'São Paulo', preco_medio: 6.1, variacao_percentual: 0.8 }),
])

const MUNICIPIOS_MA = mapa('MA', [
  area({ nome: 'SAO LUIS', municipio_id: 125, codigo_ibge: 2111300, preco_medio: 6.5, qtd_coletas: 106 }),
  area({ nome: 'IMPERATRIZ', municipio_id: 90, codigo_ibge: 2105302, preco_medio: 6.2, qtd_coletas: 4 }),
])

function mockMapa() {
  return mockApi({
    '/mapas/brasil.json': brasil,
    '/mapas/municipios/MA.json': municipiosMA,
    '/mapa': (params: URLSearchParams) => (params.get('uf') === 'MA' ? MUNICIPIOS_MA : POR_UF),
  })
}

describe('mapa do Brasil', () => {
  it('desenha as 27 UFs com o preço médio; sem coletas, "dados insuficientes"', async () => {
    mockMapa()
    renderWithProviders(<MapaBrasil />)

    const estados = await screen.findByRole('group', { name: 'Estados do Brasil' })
    expect(within(estados).getAllByRole('button')).toHaveLength(27)
    expect(screen.getByRole('button', { name: /^Maranhão: R\$\s6,30 \(ver municípios\)$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Bahia: dados insuficientes/ })).toBeInTheDocument()
    expect(screen.getByText('Dados insuficientes')).toBeInTheDocument() // legenda
  })

  it('clicar num estado abre os municípios e filtra o painel (na URL)', async () => {
    mockMapa()
    renderWithProviders(<MapaBrasil />)

    await userEvent.click(await screen.findByRole('button', { name: /^Maranhão:/ }))

    expect(screen.getByTestId('url')).toHaveTextContent('?uf=MA')
    expect(await screen.findByRole('group', { name: 'Municípios no Maranhão' })).toBeInTheDocument()
    expect(await screen.findByText('Preço médio por município no Maranhão')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /^São Luís: R\$\s6,50$/ })).toBeInTheDocument()
    expect(screen.getByText(/municípios com coletas/)).toHaveTextContent('2 de 217 municípios com coletas')
  })

  it('no estado aberto, clicar num município o escolhe; "Brasil" volta ao mapa inteiro', async () => {
    mockMapa()
    renderWithProviders(<MapaBrasil />, { url: '/?uf=MA' })

    const saoLuis = await screen.findByRole('button', { name: /^São Luís:/ })
    await userEvent.click(saoLuis)
    expect(screen.getByTestId('url')).toHaveTextContent('?uf=MA&municipio=125')
    expect(saoLuis).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('button', { name: /Brasil/ }))
    expect(screen.getByTestId('url')).toHaveTextContent(/^$/)
  })

  it('foco pelo teclado mostra o balão; amostra pequena ganha aviso', async () => {
    mockMapa()
    renderWithProviders(<MapaBrasil />, { url: '/?uf=MA' })

    const imperatriz = await screen.findByRole('button', { name: /^Imperatriz:/ })
    imperatriz.focus()
    const balao = await screen.findByRole('tooltip')
    expect(balao).toHaveTextContent('Imperatriz (MA)')
    expect(balao).toHaveTextContent(/Amostra pequena/)
  })

  it('a tabela lista os municípios e conta os que não têm dados', async () => {
    mockMapa()
    renderWithProviders(<MapaBrasil />, { url: '/?uf=MA' })

    await screen.findByRole('button', { name: /^São Luís:/ })
    await userEvent.click(screen.getByRole('button', { name: 'Ver tabela' }))

    const tabela = await screen.findByRole('table')
    expect(within(tabela).getAllByRole('row')).toHaveLength(3) // cabeçalho + 2 municípios
    expect(within(tabela).getByText('Imperatriz *')).toBeInTheDocument()
    expect(screen.getByText(/Os outros 215 municípios/)).toBeInTheDocument()
  })

  it('a métrica "Variação" troca a cor e os valores para a variação percentual', async () => {
    mockMapa()
    renderWithProviders(<MapaBrasil />)

    await userEvent.click(await screen.findByRole('radio', { name: 'Variação' }))
    expect(screen.getByRole('button', { name: /^Maranhão: −1,6%/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^São Paulo: \+0,8%/ })).toBeInTheDocument()
    expect(screen.getByText('Comparação com agosto de 2026.')).toBeInTheDocument()
  })
})
