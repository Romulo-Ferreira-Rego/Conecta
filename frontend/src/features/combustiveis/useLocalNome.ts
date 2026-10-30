// Nome do lugar filtrado, para títulos e frases ("no Maranhão", "em Imperatriz (MA)").

import { useEstados, useMunicipios, type Local } from '../../api/hooks'
import { titleCase } from '../../lib/format'
import { inState } from '../../lib/lugares'

export interface LocalNome {
  /** "Brasil", "Maranhão", "Imperatriz (MA)" */
  curto: string
  /** "no Brasil", "no Maranhão", "em Imperatriz (MA)" */
  frase: string
}

export function useLocalNome(local: Local): LocalNome {
  const { data: estados } = useEstados()
  const { data: municipios } = useMunicipios(local.uf)

  if (local.municipio) {
    const municipio = municipios?.find((m) => m.id === local.municipio)
    if (municipio) {
      const curto = `${titleCase(municipio.nome)} (${municipio.uf})`
      return { curto, frase: `em ${curto}` }
    }
  }
  if (local.uf) {
    const estado = estados?.find((e) => e.sigla === local.uf)
    const nome = estado?.nome ?? local.uf
    return { curto: nome, frase: inState(local.uf, nome) }
  }
  return { curto: 'Brasil', frase: 'no Brasil' }
}
