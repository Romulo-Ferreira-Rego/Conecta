// Escalas de cor do mapa (coroplético).
//
// Preço: escala SEQUENCIAL de um só tom (verde-petróleo), em faixas de valores "redondos"
// (6,00 · 6,20 · 6,40...), mais fáceis de ler na legenda que valores quebrados.
// Variação: escala DIVERGENTE com o cinza no meio (estável): verde = queda, vermelho = alta.
// As cores são variáveis CSS (index.css), então mudam sozinhas com o tema.

export type Metrica = 'preco' | 'variacao'

export interface Faixa {
  cor: string
  /** Limites da faixa; null = sem limite (primeira/última faixa da variação) */
  de: number | null
  ate: number | null
}

const SEQUENCIAL = 6
const PASSOS = [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100]

/** Marcações múltiplas do passo, cobrindo de min a max: (6,32; 7,57; 0,25) -> 6,25 · 6,50 ... 7,75 */
function marcacoes(min: number, max: number, passo: number): number[] {
  const inicio = Math.floor(min / passo + 1e-9) * passo
  const ticks = [inicio]
  while (ticks[ticks.length - 1] <= max - 1e-9) ticks.push(Math.round((ticks[ticks.length - 1] + passo) * 1000) / 1000)
  return ticks
}

/** Faixas de preço a partir dos valores da tela atual (Brasil ou um estado). */
export function faixasPreco(valores: number[]): Faixa[] {
  if (valores.length === 0) return []
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  if (max - min < 0.005) return [{ cor: 'var(--map-seq-4)', de: min, ate: max }] // todos iguais

  // O menor passo "redondo" que não gera mais faixas que os tons da paleta.
  const ticks = PASSOS.map((passo) => marcacoes(min, max, passo)).find((t) => t.length - 1 <= SEQUENCIAL)!
  const n = ticks.length - 1
  return ticks.slice(0, -1).map((de, i) => ({
    // Poucas faixas usam os tons espalhados pela paleta, não só os primeiros
    cor: `var(--map-seq-${n === 1 ? 4 : Math.round(1 + (i * (SEQUENCIAL - 1)) / (n - 1))})`,
    de,
    ate: ticks[i + 1],
  }))
}

/** Limites fixos (%): a legenda não muda de um produto para outro. */
const LIMITES_VARIACAO = [-3, -1, -0.25, 0.25, 1, 3]

export const FAIXAS_VARIACAO: Faixa[] = [null, ...LIMITES_VARIACAO].map((de, i) => ({
  cor: `var(--map-div-${i + 1})`,
  de,
  ate: LIMITES_VARIACAO[i] ?? null,
}))

/** Faixa de um valor; o último limite superior é inclusivo. */
export function faixaDe(valor: number, faixas: Faixa[]): Faixa | undefined {
  return faixas.find((f, i) => (f.de === null || valor >= f.de) && (f.ate === null || valor < f.ate || i === faixas.length - 1))
}
