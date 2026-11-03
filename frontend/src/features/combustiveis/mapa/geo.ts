// Geometria do mapa: lê as malhas do IBGE (TopoJSON em /public/mapas, geradas por
// `python -m etl.ibge`) e converte cada estado/município num caminho SVG.
//
// Todas as formas usam a MESMA projeção (a do Brasil inteiro). Assim o zoom num estado
// é só uma mudança do viewBox do SVG: nada é recalculado durante a animação.

import { useQuery } from '@tanstack/react-query'
import { geoArea, geoMercator, geoPath, type GeoProjection } from 'd3-geo'
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon, Position } from 'geojson'
import { useMemo } from 'react'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'

/** Tamanho do desenho em unidades do SVG (a proporção do Brasil na projeção de Mercator). */
export const MAP_W = 640
export const MAP_H = 620
const MARGEM = 8
/** Espaço à direita para os rótulos dos estados pequenos do litoral (RN, PB, PE, AL...). */
const MARGEM_DIREITA = 58

export interface ViewBox {
  x: number
  y: number
  w: number
  h: number
}

export const VIEWBOX_BRASIL: ViewBox = { x: 0, y: 0, w: MAP_W, h: MAP_H }

export interface Forma {
  /** Sigla da UF ou código IBGE do município */
  id: string
  nome: string
  d: string
  centro: [number, number]
  caixa: [[number, number], [number, number]]
}

type Props = { sigla?: string; codigo?: number; nome: string }

function toFeatures(topology: Topology): Feature<Geometry, Props>[] {
  const object = Object.values(topology.objects)[0]
  return (feature(topology, object) as FeatureCollection<Geometry, Props>).features.map(rewind)
}

/**
 * O d3 desenha na esfera e espera os anéis dos polígonos no sentido horário. Um anel no
 * sentido contrário vira "o mundo inteiro menos o estado" (área maior que meia esfera):
 * nesse caso, inverte a ordem dos pontos.
 */
function rewind(f: Feature<Geometry, Props>): Feature<Geometry, Props> {
  const fix = (rings: Position[][]) => {
    const polygon: Polygon = { type: 'Polygon', coordinates: rings }
    return geoArea(polygon) > 2 * Math.PI ? rings.map((ring) => [...ring].reverse()) : rings
  }
  const g = f.geometry
  if (g.type === 'Polygon') return { ...f, geometry: { ...g, coordinates: fix(g.coordinates) } }
  if (g.type === 'MultiPolygon') {
    return { ...f, geometry: { ...g, coordinates: g.coordinates.map(fix) } as MultiPolygon }
  }
  return f
}

export function projectionFor(features: Feature[]): GeoProjection {
  const collection: FeatureCollection = { type: 'FeatureCollection', features }
  return geoMercator().fitExtent(
    [
      [MARGEM, MARGEM],
      [MAP_W - MARGEM_DIREITA, MAP_H - MARGEM],
    ],
    collection,
  )
}

export function toFormas(features: Feature<Geometry, Props>[], projection: GeoProjection): Forma[] {
  const path = geoPath(projection)
  return features.map((f) => ({
    id: f.properties.sigla ?? String(f.properties.codigo),
    nome: f.properties.nome,
    d: path(f) ?? '',
    centro: path.centroid(f),
    caixa: path.bounds(f),
  }))
}

/**
 * Enquadra uma área com folga, mantendo a proporção do desenho
 * (assim o zoom não distorce nem corta o estado).
 */
export function fitBox([[x0, y0], [x1, y1]]: Forma['caixa'], folga = 0.08): ViewBox {
  let w = (x1 - x0) * (1 + folga * 2)
  let h = (y1 - y0) * (1 + folga * 2)
  const ratio = MAP_W / MAP_H
  if (w / h > ratio) h = w / ratio
  else w = h * ratio
  return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h }
}

export const viewBoxString = (v: ViewBox) => `${v.x} ${v.y} ${v.w} ${v.h}`

async function fetchTopology(path: string, signal: AbortSignal): Promise<Topology> {
  const response = await fetch(`${import.meta.env.BASE_URL}mapas/${path}`, { signal })
  if (!response.ok) throw new Error('Não foi possível carregar o mapa.')
  return response.json()
}

// As malhas só mudam com uma nova versão do site: ficam em cache durante toda a visita.
const geoQuery = (path: string) => ({
  queryKey: ['malha', path],
  queryFn: ({ signal }: { signal: AbortSignal }) => fetchTopology(path, signal),
  staleTime: Infinity,
  gcTime: Infinity,
})

/** Contorno das UFs e a projeção usada por todo o mapa. */
export function useBrasil() {
  const query = useQuery(geoQuery('brasil.json'))
  const geo = useMemo(() => {
    if (!query.data) return undefined
    const features = toFeatures(query.data)
    const projection = projectionFor(features)
    return { projection, estados: toFormas(features, projection) }
  }, [query.data])
  return { ...query, geo }
}

/** Municípios de uma UF, baixados só quando o visitante abre aquele estado. */
export function useMunicipiosGeo(uf: string | undefined, projection: GeoProjection | undefined) {
  const query = useQuery({ ...geoQuery(`municipios/${uf}.json`), enabled: Boolean(uf && projection) })
  const formas = useMemo(
    () => (query.data && projection ? toFormas(toFeatures(query.data), projection) : undefined),
    [query.data, projection],
  )
  return { ...query, formas }
}
