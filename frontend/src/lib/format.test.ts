import { describe, expect, it } from 'vitest'

import { niceTicks } from './chart'
import {
  formatDate,
  formatMonthLong,
  formatMonthShort,
  formatPercent,
  formatPrice,
  formatPriceDelta,
  monthsBefore,
  titleCase,
  trendOf,
} from './format'

const NBSP = ' '

describe('formatação em pt-BR', () => {
  it('formata preço em reais com vírgula e 2 casas', () => {
    expect(formatPrice(6.288)).toBe(`R$${NBSP}6,29`)
    expect(formatPrice(10)).toBe(`R$${NBSP}10,00`)
  })

  it('usa o sinal de menos tipográfico e o mais nas variações', () => {
    expect(formatPercent(1.62)).toBe('+1,6%')
    expect(formatPercent(-0.44)).toBe('−0,4%')
    expect(formatPriceDelta(-0.111)).toBe(`−R$${NBSP}0,11`)
  })

  it('classifica variações pequenas como estabilidade', () => {
    expect(trendOf(0.05)).toBe('estavel')
    expect(trendOf(null)).toBe('estavel')
    expect(trendOf(1.2)).toBe('alta')
    expect(trendOf(-1.2)).toBe('queda')
  })

  it('formata meses e datas', () => {
    expect(formatMonthLong('2026-09-01')).toBe('setembro de 2026')
    expect(formatMonthShort('2026-03-01')).toBe('mar/26')
    expect(formatDate('2026-10-27T09:00:00-03:00')).toBe('27/10/2026')
    expect(formatDate('2026-09-30')).toBe('30/09/2026')
  })

  it('calcula meses anteriores atravessando o ano', () => {
    expect(monthsBefore('2026-09-01', 11)).toBe('2025-10')
    expect(monthsBefore('2026-01-01', 1)).toBe('2025-12')
  })

  it('escreve nomes de municípios com iniciais maiúsculas', () => {
    expect(titleCase('SAO JOSE DOS CAMPOS')).toBe('Sao Jose dos Campos')
    expect(titleCase('BARRA DO CORDA')).toBe('Barra do Corda')
  })
})

describe('marcações do eixo', () => {
  it('usa passos redondos (1, 2 ou 5) que cobrem os valores', () => {
    const ticks = niceTicks(6.04, 6.91)
    expect(ticks[0]).toBeLessThanOrEqual(6.04)
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(6.91)
    expect(ticks).toEqual([6, 6.2, 6.4, 6.6, 6.8, 7])
  })
})
