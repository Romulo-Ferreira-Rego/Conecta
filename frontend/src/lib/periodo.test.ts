import { describe, expect, it } from 'vitest'

import { resolverPeriodo, parseFiltros } from '../features/combustiveis/useFiltros'
import { adjustRange, isValidRange, listMonths, MIN_MESES, monthsInRange } from './periodo'

const BOUNDS = { primeiro: '2024-07', ultimo: '2026-09' }

describe('período personalizado', () => {
  it('o mínimo é de 3 meses', () => {
    expect(MIN_MESES).toBe(3)
  })

  it('conta os meses incluindo início e fim', () => {
    expect(monthsInRange('2026-01', '2026-03')).toBe(3)
    expect(monthsInRange('2025-11', '2026-02')).toBe(4)
  })

  it('lista os meses disponíveis atravessando o ano', () => {
    expect(listMonths('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
  })

  it('aceita intervalos com 3 meses ou mais, dentro dos dados', () => {
    expect(isValidRange('2026-07', '2026-09', BOUNDS)).toBe(true)
    expect(isValidRange('2024-07', '2026-09', BOUNDS)).toBe(true)
  })

  it('recusa intervalos curtos, invertidos ou fora dos dados', () => {
    expect(isValidRange('2026-08', '2026-09', BOUNDS)).toBe(false) // 2 meses
    expect(isValidRange('2026-09', '2026-01', BOUNDS)).toBe(false) // invertido
    expect(isValidRange('2020-01', '2020-06', BOUNDS)).toBe(false) // antes dos dados
    expect(isValidRange('2026-07', '2026-12', BOUNDS)).toBe(false) // depois dos dados
    expect(isValidRange('2026-13', '2027-01', BOUNDS)).toBe(false) // mês inexistente
  })

  it('ao mudar o início, empurra o fim para manter o mínimo', () => {
    expect(adjustRange('2025-05', '2025-06', 'inicio', BOUNDS)).toEqual({ inicio: '2025-05', fim: '2025-07' })
  })

  it('ao mudar o fim, puxa o início para manter o mínimo', () => {
    expect(adjustRange('2025-05', '2025-05', 'fim', BOUNDS)).toEqual({ inicio: '2025-03', fim: '2025-05' })
  })

  it('nunca sai dos dados ao ajustar, mesmo escolhendo as pontas', () => {
    expect(adjustRange('2026-09', '2026-09', 'inicio', BOUNDS)).toEqual({ inicio: '2026-07', fim: '2026-09' })
    expect(adjustRange('2024-07', '2024-07', 'fim', BOUNDS)).toEqual({ inicio: '2024-07', fim: '2024-09' })
  })

  it('mantém o intervalo quando ele já é válido', () => {
    expect(adjustRange('2025-01', '2025-12', 'inicio', BOUNDS)).toEqual({ inicio: '2025-01', fim: '2025-12' })
  })
})

describe('período na URL', () => {
  const params = (query: string) => parseFiltros(new URLSearchParams(query))

  it('lê um intervalo personalizado válido', () => {
    expect(params('periodo=personalizado&inicio=2025-01&fim=2025-06')).toMatchObject({
      periodo: 'personalizado',
      inicio: '2025-01',
      fim: '2025-06',
    })
  })

  it('volta para 12 meses se o intervalo da URL for curto ou malformado', () => {
    expect(params('periodo=personalizado&inicio=2026-08&fim=2026-09').periodo).toBe('12m')
    expect(params('periodo=personalizado&inicio=abc&fim=2026-09').periodo).toBe('12m')
    expect(params('periodo=personalizado').periodo).toBe('12m')
  })

  it('ignora início e fim quando o período não é personalizado', () => {
    expect(params('periodo=6m&inicio=2025-01&fim=2025-06')).toMatchObject({ periodo: '6m', inicio: undefined })
  })

  it('usa o padrão quando o intervalo bem formado está fora dos dados', () => {
    const filtros = params('periodo=personalizado&inicio=2020-01&fim=2020-06')
    expect(resolverPeriodo(filtros, '2024-07-01', '2026-09-30')).toEqual({ inicio: '2025-10', personalizado: false })
  })

  it('entrega o intervalo personalizado quando ele cabe nos dados', () => {
    const filtros = params('periodo=personalizado&inicio=2025-01&fim=2025-06')
    expect(resolverPeriodo(filtros, '2024-07-01', '2026-09-30')).toEqual({
      inicio: '2025-01',
      fim: '2025-06',
      personalizado: true,
    })
  })
})
