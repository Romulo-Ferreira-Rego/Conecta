// Filtros do painel guardados na URL (?produto=gasolina&uf=MA&periodo=12m).
// Assim a consulta pode ser compartilhada por link e o botão "voltar" funciona.
// Só os filtros vão para a URL, nenhum outro dado (LGPD, seção 7.2).

import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import type { Local } from '../../api/hooks'
import { monthsBefore } from '../../lib/format'
import { isMonth, isValidRange, MIN_MESES, monthsInRange, toMonth } from '../../lib/periodo'

export type Periodo = '6m' | '12m' | '24m' | 'tudo' | 'personalizado'

export const PERIODOS: { value: Periodo; label: string; short: string; meses: number | null }[] = [
  { value: '6m', label: '6 meses', short: '6m', meses: 6 },
  { value: '12m', label: '12 meses', short: '12m', meses: 12 },
  { value: '24m', label: '24 meses', short: '24m', meses: 24 },
  { value: 'tudo', label: 'Tudo', short: 'Tudo', meses: null },
  { value: 'personalizado', label: 'Personalizado', short: 'Personalizado', meses: null },
]

export const PRODUTO_PADRAO = 'gasolina'
export const PERIODO_PADRAO: Periodo = '12m'

export interface Filtros {
  produto: string
  uf?: string
  municipio?: number
  periodo: Periodo
  /** Só no período personalizado: "AAAA-MM" */
  inicio?: string
  fim?: string
}

export function parseFiltros(params: URLSearchParams): Filtros {
  const ufBruta = params.get('uf')?.toUpperCase()
  const uf = ufBruta && /^[A-Z]{2}$/.test(ufBruta) ? ufBruta : undefined
  const municipio = Number(params.get('municipio'))
  let periodo = params.get('periodo') as Periodo
  if (!PERIODOS.some((p) => p.value === periodo)) periodo = PERIODO_PADRAO

  // Período personalizado só vale com início e fim bem formados e o mínimo de meses;
  // um link quebrado ou curto demais volta para o padrão em vez de quebrar o gráfico.
  const inicio = params.get('inicio')
  const fim = params.get('fim')
  const personalizadoValido =
    periodo === 'personalizado' && isMonth(inicio) && isMonth(fim) && monthsInRange(inicio, fim) >= MIN_MESES
  if (periodo === 'personalizado' && !personalizadoValido) periodo = PERIODO_PADRAO

  return {
    produto: params.get('produto') || PRODUTO_PADRAO,
    uf,
    // Município só vale junto com uma UF válida
    municipio: uf && Number.isInteger(municipio) && municipio > 0 ? municipio : undefined,
    periodo,
    inicio: personalizadoValido ? inicio : undefined,
    fim: personalizadoValido ? fim : undefined,
  }
}

/** Primeiro mês de um período pronto (6, 12, 24 meses), contado do mês mais recente com dados. */
export function inicioDoPeriodo(periodo: Periodo, ultimoMes?: string | null): string | undefined {
  const meses = PERIODOS.find((p) => p.value === periodo)?.meses
  if (!meses || !ultimoMes) return undefined
  return monthsBefore(ultimoMes, meses - 1)
}

/**
 * Intervalo efetivo do gráfico ("AAAA-MM"). O personalizado também precisa caber nos
 * dados disponíveis; se não couber (link antigo, por exemplo), usa o período padrão.
 */
export function resolverPeriodo(
  filtros: Filtros,
  primeiraColeta?: string | null,
  ultimaColeta?: string | null,
): { inicio?: string; fim?: string; personalizado: boolean } {
  if (filtros.periodo === 'personalizado' && filtros.inicio && filtros.fim && primeiraColeta && ultimaColeta) {
    const bounds = { primeiro: toMonth(primeiraColeta), ultimo: toMonth(ultimaColeta) }
    if (isValidRange(filtros.inicio, filtros.fim, bounds)) {
      return { inicio: filtros.inicio, fim: filtros.fim, personalizado: true }
    }
    return { inicio: inicioDoPeriodo(PERIODO_PADRAO, ultimaColeta), personalizado: false }
  }
  return { inicio: inicioDoPeriodo(filtros.periodo, ultimaColeta), personalizado: false }
}

export function useFiltros() {
  const [params, setParams] = useSearchParams()
  const filtros = useMemo(() => parseFiltros(params), [params])

  const update = useCallback(
    (changes: Partial<Filtros>) => {
      setParams(
        (current) => {
          const next = { ...parseFiltros(current), ...changes }
          if ('uf' in changes) next.municipio = undefined // trocou a UF: o município deixa de valer
          const search = new URLSearchParams()
          if (next.produto !== PRODUTO_PADRAO) search.set('produto', next.produto)
          if (next.uf) search.set('uf', next.uf)
          if (next.uf && next.municipio) search.set('municipio', String(next.municipio))
          if (next.periodo !== PERIODO_PADRAO) search.set('periodo', next.periodo)
          if (next.periodo === 'personalizado' && next.inicio && next.fim) {
            search.set('inicio', next.inicio)
            search.set('fim', next.fim)
          }
          return search
        },
        { preventScrollReset: true },
      )
    },
    [setParams],
  )

  const local: Local = useMemo(() => ({ uf: filtros.uf, municipio: filtros.municipio }), [filtros.uf, filtros.municipio])

  return { filtros, local, update }
}
