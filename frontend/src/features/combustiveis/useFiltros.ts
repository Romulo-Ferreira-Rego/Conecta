// Filtros do painel guardados na URL (?produto=gasolina&uf=MA&periodo=12m).
// Assim a consulta pode ser compartilhada por link e o botão "voltar" funciona.
// Só os filtros vão para a URL, nenhum outro dado (LGPD, seção 7.2).

import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import type { Local } from '../../api/hooks'
import { monthsBefore } from '../../lib/format'

export type Periodo = '6m' | '12m' | '24m' | 'tudo'

export const PERIODOS: { value: Periodo; label: string; meses: number | null }[] = [
  { value: '6m', label: '6 meses', meses: 6 },
  { value: '12m', label: '12 meses', meses: 12 },
  { value: '24m', label: '24 meses', meses: 24 },
  { value: 'tudo', label: 'Tudo', meses: null },
]

export const PRODUTO_PADRAO = 'gasolina'
export const PERIODO_PADRAO: Periodo = '12m'

export interface Filtros {
  produto: string
  uf?: string
  municipio?: number
  periodo: Periodo
}

export function parseFiltros(params: URLSearchParams): Filtros {
  const ufBruta = params.get('uf')?.toUpperCase()
  const uf = ufBruta && /^[A-Z]{2}$/.test(ufBruta) ? ufBruta : undefined
  const municipio = Number(params.get('municipio'))
  const periodo = params.get('periodo') as Periodo
  return {
    produto: params.get('produto') || PRODUTO_PADRAO,
    uf,
    // Município só vale junto com uma UF válida
    municipio: uf && Number.isInteger(municipio) && municipio > 0 ? municipio : undefined,
    periodo: PERIODOS.some((p) => p.value === periodo) ? periodo : PERIODO_PADRAO,
  }
}

/** Primeiro mês do período, contado a partir do mês mais recente com dados ("AAAA-MM"). */
export function inicioDoPeriodo(periodo: Periodo, ultimoMes?: string | null): string | undefined {
  const meses = PERIODOS.find((p) => p.value === periodo)?.meses
  if (!meses || !ultimoMes) return undefined
  return monthsBefore(ultimoMes, meses - 1)
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
