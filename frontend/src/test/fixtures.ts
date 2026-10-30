// Respostas de exemplo da API, no mesmo formato do back-end.

import type { Estado, Resumo } from '../api/types'

export function resumo(produto: string, overrides: Partial<Resumo> = {}): Resumo {
  return {
    produto,
    nome: produto.toUpperCase(),
    unidade: produto === 'gnv' ? 'R$ / m³' : 'R$ / litro',
    mes: '2026-09-01',
    preco_medio: 6.288,
    qtd_coletas: 1234,
    mes_anterior: '2026-08-01',
    preco_anterior: 6.4,
    variacao: -0.112,
    variacao_percentual: -1.75,
    ...overrides,
  }
}

export const ESTADOS: Estado[] = [
  { sigla: 'MA', nome: 'Maranhão', regiao: 'Nordeste' },
  { sigla: 'SP', nome: 'São Paulo', regiao: 'Sudeste' },
]

export const SERIE_VAZIA = { produto: 'gasolina', unidade: 'R$ / litro', pontos: [] }
