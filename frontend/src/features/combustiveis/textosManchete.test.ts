import { describe, expect, it } from 'vitest'

import { resumo } from '../../test/fixtures'
import { buildDeck, buildHeadline } from './textosManchete'
import { inicioDoPeriodo, parseFiltros } from './useFiltros'

const BRASIL = { curto: 'Brasil', frase: 'no Brasil' }
const MARANHAO = { curto: 'Maranhão', frase: 'no Maranhão' }

describe('manchete gerada dos dados', () => {
  it('fala em queda quando o preço cai', () => {
    expect(buildHeadline(resumo('gasolina', { variacao_percentual: -1.62 }), MARANHAO)).toBe(
      'Gasolina cai 1,6% no Maranhão em setembro',
    )
  })

  it('fala em alta quando o preço sobe', () => {
    expect(buildHeadline(resumo('diesel-s10', { variacao_percentual: 3.1 }), BRASIL)).toBe(
      'Diesel S10 sobe 3,1% no Brasil em setembro',
    )
  })

  it('fala em estabilidade para variações mínimas ou sem mês anterior', () => {
    expect(buildHeadline(resumo('etanol', { variacao_percentual: 0.04 }), BRASIL)).toBe(
      'Etanol tem preço estável no Brasil em setembro',
    )
    expect(buildHeadline(resumo('etanol', { variacao_percentual: null }), BRASIL)).toContain('estável')
  })

  it('linha fina traz o preço, o mês anterior e a unidade', () => {
    const deck = buildDeck(resumo('gnv', { preco_medio: 4.88, preco_anterior: 4.81 }))
    expect(deck).toContain('R$ 4,88 por m³')
    expect(deck).toContain('ante R$ 4,81 em agosto')
    expect(deck).toContain('1.234 coletas')
  })
})

describe('filtros na URL', () => {
  it('usa valores padrão quando a URL está vazia', () => {
    expect(parseFiltros(new URLSearchParams())).toEqual({
      produto: 'gasolina',
      uf: undefined,
      municipio: undefined,
      periodo: '12m',
    })
  })

  it('ignora valores inválidos e município sem UF', () => {
    const filtros = parseFiltros(new URLSearchParams('uf=xyz&municipio=12&periodo=99m'))
    expect(filtros.uf).toBeUndefined()
    expect(filtros.municipio).toBeUndefined()
    expect(filtros.periodo).toBe('12m')
  })

  it('aceita UF minúscula e município numérico', () => {
    const filtros = parseFiltros(new URLSearchParams('uf=ma&municipio=42'))
    expect(filtros).toMatchObject({ uf: 'MA', municipio: 42 })
  })

  it('calcula o início do período a partir do último mês com dados', () => {
    expect(inicioDoPeriodo('12m', '2026-09-30')).toBe('2025-10')
    expect(inicioDoPeriodo('6m', '2026-09-30')).toBe('2026-04')
    expect(inicioDoPeriodo('tudo', '2026-09-30')).toBeUndefined()
  })
})
