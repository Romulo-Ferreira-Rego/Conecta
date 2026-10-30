// Regras do período personalizado do gráfico de evolução.
// Meses no formato "AAAA-MM". O intervalo é inclusivo: jan a mar = 3 meses.

/** Menor intervalo aceito: com menos de 3 pontos, a linha não mostra tendência. */
export const MIN_MESES = 3

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/

export function isMonth(value: string | null | undefined): value is string {
  return Boolean(value && MONTH_RE.test(value))
}

/** "2026-09-30" ou "2026-09" -> "2026-09" */
export function toMonth(isoDate: string): string {
  return isoDate.slice(0, 7)
}

function index(month: string): number {
  const [year, m] = month.split('-').map(Number)
  return year * 12 + (m - 1)
}

function fromIndex(i: number): string {
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`
}

/** Quantidade de meses entre início e fim, contando os dois. */
export function monthsInRange(inicio: string, fim: string): number {
  return index(fim) - index(inicio) + 1
}

export function addMonths(month: string, n: number): string {
  return fromIndex(index(month) + n)
}

/** Todos os meses disponíveis, do primeiro ao último. */
export function listMonths(primeiro: string, ultimo: string): string[] {
  const months: string[] = []
  for (let i = index(primeiro); i <= index(ultimo); i++) months.push(fromIndex(i))
  return months
}

export interface Bounds {
  primeiro: string
  ultimo: string
}

/** O intervalo é válido se está dentro dos dados e tem pelo menos MIN_MESES meses. */
export function isValidRange(inicio: string, fim: string, bounds: Bounds): boolean {
  return (
    isMonth(inicio) &&
    isMonth(fim) &&
    index(inicio) >= index(bounds.primeiro) &&
    index(fim) <= index(bounds.ultimo) &&
    monthsInRange(inicio, fim) >= MIN_MESES
  )
}

/**
 * Ao trocar uma das pontas, ajusta a outra para manter o mínimo de meses
 * sem sair dos dados disponíveis.
 */
export function adjustRange(
  inicio: string,
  fim: string,
  changed: 'inicio' | 'fim',
  bounds: Bounds,
): { inicio: string; fim: string } {
  const lastStart = addMonths(bounds.ultimo, -(MIN_MESES - 1))
  const firstEnd = addMonths(bounds.primeiro, MIN_MESES - 1)
  if (changed === 'inicio') {
    const start = index(inicio) > index(lastStart) ? lastStart : inicio
    const minEnd = addMonths(start, MIN_MESES - 1)
    return { inicio: start, fim: index(fim) < index(minEnd) ? minEnd : fim }
  }
  const end = index(fim) < index(firstEnd) ? firstEnd : fim
  const maxStart = addMonths(end, -(MIN_MESES - 1))
  return { inicio: index(inicio) > index(maxStart) ? maxStart : inicio, fim: end }
}
