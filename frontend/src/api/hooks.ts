// Hooks de dados com TanStack Query: cache, requisições sem duplicidade e nova tentativa automática.

import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { apiGet } from './client'
import type { Estado, EtanolGasolina, Mapa, Meta, Municipio, Produto, Ranking, Resumo, Serie } from './types'

export interface Local {
  uf?: string
  municipio?: number
}

// Os dados mudam no máximo uma vez por semana: catálogos ficam "frescos" por 1 hora.
const ONE_HOUR = 60 * 60 * 1000

export function useProdutos() {
  return useQuery({
    queryKey: ['produtos'],
    queryFn: ({ signal }) => apiGet<Produto[]>('/produtos', {}, signal),
    staleTime: ONE_HOUR,
  })
}

export function useEstados() {
  return useQuery({
    queryKey: ['estados'],
    queryFn: ({ signal }) => apiGet<Estado[]>('/estados', {}, signal),
    staleTime: ONE_HOUR,
  })
}

export function useMunicipios(uf?: string) {
  return useQuery({
    queryKey: ['municipios', uf],
    queryFn: ({ signal }) => apiGet<Municipio[]>('/municipios', { uf }, signal),
    enabled: Boolean(uf),
    staleTime: ONE_HOUR,
  })
}

export function useResumo(local: Local) {
  return useQuery({
    queryKey: ['resumo', local],
    queryFn: ({ signal }) => apiGet<Resumo[]>('/resumo', { ...local }, signal),
    placeholderData: keepPreviousData, // mantém os números na tela enquanto troca o filtro
  })
}

export function useSerie(produto: string, local: Local, inicio?: string, fim?: string) {
  return useQuery({
    queryKey: ['serie', produto, local, inicio, fim],
    queryFn: ({ signal }) => apiGet<Serie>('/serie', { produto, ...local, inicio, fim }, signal),
    placeholderData: keepPreviousData,
  })
}

export function useRanking(
  produto: string,
  nivel: 'uf' | 'municipio',
  ordem: 'asc' | 'desc',
  limite = 10,
  uf?: string,
) {
  return useQuery({
    queryKey: ['ranking', produto, nivel, ordem, limite, uf],
    queryFn: ({ signal }) => apiGet<Ranking>('/ranking', { produto, nivel, ordem, limite, uf }, signal),
    placeholderData: keepPreviousData,
  })
}

export function useEtanolGasolina(local: Local) {
  return useQuery({
    queryKey: ['etanol-gasolina', local],
    queryFn: ({ signal }) => apiGet<EtanolGasolina | null>('/etanol-gasolina', { ...local }, signal),
    placeholderData: keepPreviousData,
  })
}

export function useMeta() {
  return useQuery({
    queryKey: ['meta'],
    queryFn: ({ signal }) => apiGet<Meta>('/meta', {}, signal),
    staleTime: ONE_HOUR,
  })
}

/** Preço médio por UF (sem `uf`) ou pelos municípios de uma UF, para o mapa. */
export function useMapa(produto: string, uf?: string) {
  return useQuery({
    queryKey: ['mapa', produto, uf],
    queryFn: ({ signal }) => apiGet<Mapa>('/mapa', { produto, uf }, signal),
    placeholderData: (anterior) => (anterior?.uf === (uf ?? null) ? anterior : undefined), // troca de produto sem piscar
  })
}
