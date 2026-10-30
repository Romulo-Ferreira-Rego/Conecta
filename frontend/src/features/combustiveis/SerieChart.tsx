import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useMeta, useSerie } from '../../api/hooks'
import type { PontoSerie } from '../../api/types'
import { formatMonthLong, formatMonthShort, formatNumber, formatPrice } from '../../lib/format'
import { niceTicks } from '../../lib/chart'
import { productLabel } from '../../lib/lugares'
import { Panel } from '../../components/ui/Panel'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'
import { ChartOrTable, DataTable } from './ChartFrame'
import { useTableToggle, type TooltipLike } from './useTableToggle'
import { PERIODO_PADRAO, PERIODOS, resolverPeriodo, useFiltros } from './useFiltros'
import { useLocalNome } from './useLocalNome'

function SerieTooltip({ active, payload }: TooltipLike) {
  if (!active || !payload?.length) return null
  const ponto = payload[0].payload as PontoSerie
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2.5 text-xs shadow-[0_8px_24px_-12px_rgb(15_23_42/0.35)]">
      <p className="font-medium text-ink first-letter:uppercase">{formatMonthLong(ponto.mes)}</p>
      <p className="mt-1.5 flex items-center gap-2 text-ink">
        <span className="h-0.5 w-3 rounded-full bg-[var(--chart-series)]" aria-hidden="true" />
        Média <span className="tnum ml-auto pl-4 font-semibold">{formatPrice(ponto.preco_medio)}</span>
      </p>
      <p className="mt-1 flex text-muted">
        Menor e maior <span className="tnum ml-auto pl-4">{formatNumber(ponto.preco_min)} – {formatNumber(ponto.preco_max)}</span>
      </p>
      <p className="mt-1 flex text-muted">
        Coletas <span className="tnum ml-auto pl-4">{formatNumber(ponto.qtd_coletas, 0)}</span>
      </p>
    </div>
  )
}

export function SerieChart() {
  const { filtros, local } = useFiltros()
  const lugar = useLocalNome(local)
  const { data: meta } = useMeta()
  const periodoEfetivo = resolverPeriodo(filtros, meta?.primeira_coleta, meta?.ultima_coleta)
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useSerie(
    filtros.produto,
    local,
    periodoEfetivo.inicio,
    periodoEfetivo.fim,
  )
  const { table, button } = useTableToggle()
  const pontos = data?.pontos ?? []

  let subtitulo = 'Preço médio mensal'
  if (periodoEfetivo.personalizado && periodoEfetivo.inicio && periodoEfetivo.fim) {
    subtitulo += `, de ${formatMonthLong(`${periodoEfetivo.inicio}-01`)} a ${formatMonthLong(`${periodoEfetivo.fim}-01`)}`
  } else {
    // Personalizado inválido (fora dos dados) cai no período padrão
    const exibido = filtros.periodo === 'personalizado' ? PERIODO_PADRAO : filtros.periodo
    if (exibido !== 'tudo') subtitulo += `, últimos ${PERIODOS.find((p) => p.value === exibido)?.label}`
  }

  const values = pontos.map((p) => p.preco_medio)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const ticks = niceTicks(min, max)
  const ultimo = pontos[pontos.length - 1]

  const descricao = pontos.length
    ? `Preço médio mensal ${lugar.frase}, de ${formatMonthLong(pontos[0].mes)} a ${formatMonthLong(pontos[pontos.length - 1].mes)}: ` +
      `variou entre ${formatPrice(min)} e ${formatPrice(max)}; o último valor é ${formatPrice(values[values.length - 1])}.`
    : ''

  return (
    <Panel
      id="evolucao"
      eyebrow="Evolução"
      title={`${productLabel(filtros.produto)} ${lugar.frase}`}
      description={subtitulo}
      actions={button}
    >
      {isError ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : isPending ? (
        <Skeleton className="h-[300px] w-full" />
      ) : pontos.length === 0 ? (
        <EmptyState hint="Tente outro combustível ou um local mais amplo." />
      ) : (
        <ChartOrTable
          table={table}
          tableView={
            <DataTable
              caption={descricao}
              head={['Mês', 'Média (R$)', 'Menor', 'Maior', 'Coletas']}
              rows={[...pontos].reverse().map((p) => [
                formatMonthShort(p.mes),
                formatNumber(p.preco_medio, 3),
                formatNumber(p.preco_min),
                formatNumber(p.preco_max),
                formatNumber(p.qtd_coletas, 0),
              ])}
            />
          }
          chart={
            <figure className={`transition-opacity duration-300 ${isPlaceholderData ? 'opacity-60' : ''}`}>
              <figcaption className="sr-only">{descricao}</figcaption>
              <div className="h-[300px] w-full" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={pontos} margin={{ top: 28, right: 32, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="serie-wash" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-series)" stopOpacity={0.14} />
                        <stop offset="100%" stopColor="var(--chart-series)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                    <XAxis
                      dataKey="mes"
                      tickFormatter={formatMonthShort}
                      tick={{ fill: 'var(--muted)', fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--line-strong)' }}
                      minTickGap={24}
                      tickMargin={10}
                    />
                    <YAxis
                      domain={[ticks[0], ticks[ticks.length - 1]]}
                      ticks={ticks}
                      tickFormatter={(v: number) => formatNumber(v)}
                      tick={{ fill: 'var(--muted)', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={44}
                      className="tnum"
                    />
                    <Tooltip
                      content={SerieTooltip}
                      cursor={{ stroke: 'var(--line-strong)', strokeWidth: 1 }}
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="preco_medio"
                      fill="url(#serie-wash)"
                      stroke="none"
                      isAnimationActive
                      animationDuration={900}
                      animationEasing="ease-out"
                    />
                    <Line
                      type="monotone"
                      dataKey="preco_medio"
                      stroke="var(--chart-series)"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      dot={false}
                      activeDot={{ r: 5, fill: 'var(--chart-series)', stroke: 'var(--surface)', strokeWidth: 2 }}
                      animationDuration={900}
                      animationEasing="ease-out"
                    />
                    {/* Rótulo só no último valor (rotular o que importa, não todo ponto) */}
                    <ReferenceDot
                      x={ultimo.mes}
                      y={ultimo.preco_medio}
                      r={4}
                      fill="var(--chart-series)"
                      stroke="var(--surface)"
                      strokeWidth={2}
                      label={{
                        value: formatPrice(ultimo.preco_medio),
                        position: 'top',
                        offset: 10,
                        fill: 'var(--ink)',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </figure>
          }
        />
      )}
    </Panel>
  )
}
