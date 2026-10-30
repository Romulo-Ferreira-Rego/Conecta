// Textos jornalísticos gerados a partir dos números (título e linha fina da página).

import type { Resumo } from '../../api/types'
import { formatNumber, formatPercent, formatPrice, monthName, trendOf } from '../../lib/format'
import { productLabel, unitLabel } from '../../lib/lugares'
import type { LocalNome } from './useLocalNome'

/** Ex.: "Gasolina cai 1,6% no Maranhão em setembro" */
export function buildHeadline(item: Resumo, lugar: LocalNome): string {
  const produto = productLabel(item.produto)
  const mes = monthName(item.mes)
  const trend = trendOf(item.variacao_percentual)
  if (trend === 'estavel' || item.variacao_percentual === null) {
    return `${produto} tem preço estável ${lugar.frase} em ${mes}`
  }
  const verbo = trend === 'alta' ? 'sobe' : 'cai'
  const pct = formatPercent(Math.abs(item.variacao_percentual)).replace('+', '')
  return `${produto} ${verbo} ${pct} ${lugar.frase} em ${mes}`
}

/** Ex.: "O preço médio chegou a R$ 6,73 por litro, ante R$ 6,84 em agosto. ..." */
export function buildDeck(item: Resumo): string {
  const preco = `${formatPrice(item.preco_medio)} ${unitLabel(item.unidade)}`
  const coletas = formatNumber(item.qtd_coletas, 0)
  if (item.preco_anterior !== null && item.mes_anterior) {
    return `O preço médio chegou a ${preco}, ante ${formatPrice(item.preco_anterior)} em ${monthName(item.mes_anterior)}. Média de ${coletas} coletas da ANP em postos de combustíveis.`
  }
  return `O preço médio foi de ${preco}, segundo ${coletas} coletas da ANP em postos de combustíveis.`
}
