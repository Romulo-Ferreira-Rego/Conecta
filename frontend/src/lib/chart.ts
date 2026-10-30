// Utilitários dos gráficos.

/** Eixo com marcações "redondas" (ex.: 6,00 · 6,20 · 6,40), em vez de valores quebrados. */
export function niceTicks(min: number, max: number, count = 6): number[] {
  const span = Math.max(max - min, 0.01)
  const raw = span / (count - 1)
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw
  const start = Math.floor(min / step) * step
  const end = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000)
  return ticks
}
