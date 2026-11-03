import { describe, expect, it } from 'vitest'

import { FAIXAS_VARIACAO, faixaDe, faixasPreco } from './escala'

describe('escala de preço', () => {
  it('usa faixas de valores redondos, sem passar dos 6 tons da paleta', () => {
    const faixas = faixasPreco([6.32, 6.64, 7.01, 7.57])
    expect(faixas.map((f) => f.de)).toEqual([6.25, 6.5, 6.75, 7, 7.25, 7.5])
    expect(faixas.at(-1)?.ate).toBe(7.75)
    expect(faixas[0].cor).toBe('var(--map-seq-1)')
    expect(faixas.at(-1)?.cor).toBe('var(--map-seq-6)')
  })

  it('com poucas faixas, espalha os tons pela paleta (do mais claro ao mais escuro)', () => {
    const faixas = faixasPreco([6.0, 6.18])
    expect(faixas.length).toBeLessThanOrEqual(6)
    expect(faixas[0].cor).toBe('var(--map-seq-1)')
    expect(faixas.at(-1)?.cor).toBe('var(--map-seq-6)')
  })

  it('todos os valores iguais: uma faixa só', () => {
    expect(faixasPreco([6.5, 6.5])).toHaveLength(1)
    expect(faixasPreco([])).toEqual([])
  })

  it('o mais barato cai na primeira faixa e o mais caro na última', () => {
    const faixas = faixasPreco([6.32, 7.57])
    expect(faixaDe(6.32, faixas)).toBe(faixas[0])
    expect(faixaDe(7.57, faixas)).toBe(faixas.at(-1))
  })
})

describe('escala de variação', () => {
  it('cinza no meio (estável), verde na queda e vermelho na alta', () => {
    expect(faixaDe(0.1, FAIXAS_VARIACAO)?.cor).toBe('var(--map-div-4)')
    expect(faixaDe(-0.1, FAIXAS_VARIACAO)?.cor).toBe('var(--map-div-4)')
    expect(faixaDe(-8, FAIXAS_VARIACAO)?.cor).toBe('var(--map-div-1)')
    expect(faixaDe(-1.5, FAIXAS_VARIACAO)?.cor).toBe('var(--map-div-2)')
    expect(faixaDe(2, FAIXAS_VARIACAO)?.cor).toBe('var(--map-div-6)')
    expect(faixaDe(12, FAIXAS_VARIACAO)?.cor).toBe('var(--map-div-7)')
  })
})
