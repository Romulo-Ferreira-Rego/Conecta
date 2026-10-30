// Formatação em português do Brasil (RNF06): R$ com vírgula, meses por extenso, sinais de variação.

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const decimal = (digits: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })

/** 6.288 -> "R$ 6,29" */
export function formatPrice(value: number): string {
  return currency.format(value) // usa espaço inseparável depois de "R$": o valor nunca quebra linha
}

/** Só o número, sem "R$": 6.288 -> "6,29" */
export function formatNumber(value: number, digits = 2): string {
  return decimal(digits).format(value)
}

/** Sinal tipográfico de verdade (− é o "menos", não o hífen). */
function sign(value: number): string {
  if (value > 0) return '+'
  if (value < 0) return '−'
  return ''
}

/** 1.62 -> "+1,6%" ; -0.4 -> "−0,4%" */
export function formatPercent(value: number, digits = 1): string {
  return `${sign(value)}${decimal(digits).format(Math.abs(value))}%`
}

/** 0.111 -> "+R$ 0,11" */
export function formatPriceDelta(value: number): string {
  return `${sign(value)}${formatPrice(Math.abs(value))}`
}

export type Trend = 'alta' | 'queda' | 'estavel'

/** Variações abaixo de 0,1% contam como estabilidade. */
export function trendOf(percent: number | null | undefined): Trend {
  if (percent === null || percent === undefined || Math.abs(percent) < 0.1) return 'estavel'
  return percent > 0 ? 'alta' : 'queda'
}

function parseMonth(iso: string): [number, number] {
  const [year, month] = iso.split('-').map(Number)
  return [year, month]
}

/** "2026-09-01" -> "setembro de 2026" */
export function formatMonthLong(iso: string): string {
  const [year, month] = parseMonth(iso)
  return `${MESES[month - 1]} de ${year}`
}

/** "2026-09-01" -> "set/26" (eixos de gráfico) */
export function formatMonthShort(iso: string): string {
  const [year, month] = parseMonth(iso)
  return `${MESES[month - 1].slice(0, 3)}/${String(year).slice(2)}`
}

/** "2026-09-01" -> "setembro" */
export function monthName(iso: string): string {
  return MESES[parseMonth(iso)[1] - 1]
}

/** "2026-10-27T09:00:00-03:00" ou "2026-09-30" -> "27/10/2026" */
export function formatDate(iso: string): string {
  const [datePart] = iso.split('T')
  const [year, month, day] = datePart.split('-')
  return `${day}/${month}/${year}`
}

/** "2026-09-01" menos N meses -> "2026-03" (formato do filtro inicio da API) */
export function monthsBefore(iso: string, months: number): string {
  const [year, month] = parseMonth(iso)
  const index = year * 12 + (month - 1) - months
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

const SMALL_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', "d'"])

/** "SAO JOSE DOS CAMPOS" -> "Sao Jose dos Campos" (a ANP publica os nomes sem acento) */
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map((word, i) => (i > 0 && SMALL_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ')
}
