// Nomes de produtos e lugares para textos em linguagem natural ("no Maranhão", "na Bahia").

export const PRODUTOS_DESTAQUE = ['gasolina', 'etanol', 'diesel-s10', 'gnv'] as const

const NOMES_PRODUTO: Record<string, string> = {
  gasolina: 'Gasolina',
  'gasolina-aditivada': 'Gasolina aditivada',
  etanol: 'Etanol',
  diesel: 'Diesel',
  'diesel-s10': 'Diesel S10',
  gnv: 'GNV',
}

/** Nome para exibição: "diesel-s10" -> "Diesel S10" */
export function productLabel(codigo: string): string {
  return NOMES_PRODUTO[codigo] ?? codigo
}

/** Unidade curta: "R$ / litro" -> "por litro" */
export function unitLabel(unidade: string): string {
  return unidade.includes('m³') || unidade.includes('m3') ? 'por m³' : 'por litro'
}

// Preposição + artigo de cada UF ("no Maranhão", "na Bahia", "em São Paulo").
const PREPOSICAO_UF: Record<string, string> = {
  AC: 'no', AL: 'em', AP: 'no', AM: 'no', BA: 'na', CE: 'no', DF: 'no', ES: 'no',
  GO: 'em', MA: 'no', MT: 'em', MS: 'em', MG: 'em', PA: 'no', PB: 'na', PR: 'no',
  PE: 'em', PI: 'no', RJ: 'no', RN: 'no', RS: 'no', RO: 'em', RR: 'em', SC: 'em',
  SP: 'em', SE: 'em', TO: 'no',
}

export function inState(sigla: string, nome: string): string {
  return `${PREPOSICAO_UF[sigla] ?? 'em'} ${nome}`
}
