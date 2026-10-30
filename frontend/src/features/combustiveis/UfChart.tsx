import { Bar, BarChart, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { useRanking, useResumo } from '../../api/hooks'
import type { ItemRanking } from '../../api/types'
import { formatMonthLong, formatNumber, formatPrice } from '../../lib/format'
import { productLabel } from '../../lib/lugares'
import { Panel } from '../../components/ui/Panel'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'
import { ChartOrTable, DataTable } from './ChartFrame'
import { useTableToggle, type TooltipLike } from './useTableToggle'
import { useFiltros } from './useFiltros'

const ROW = 22

function UfTooltip({ active, payload }: TooltipLike) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload as ItemRanking
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-[0_8px_24px_-12px_rgb(15_23_42/0.35)]">
      <p className="font-medium text-ink">{item.nome}</p>
      <p className="mt-1 flex gap-4 text-ink-2">
        {item.posicao}º mais caro <span className="tnum ml-auto font-semibold text-ink">{formatPrice(item.preco_medio)}</span>
      </p>
      <p className="mt-0.5 flex gap-4 text-muted">
        Coletas <span className="tnum ml-auto">{formatNumber(item.qtd_coletas, 0)}</span>
      </p>
    </div>
  )
}

/** Barras horizontais com as 27 UFs, da mais cara à mais barata; a UF filtrada fica em destaque. */
export function UfChart() {
  const { filtros, update } = useFiltros()
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useRanking(filtros.produto, 'uf', 'desc', 27)
  const { data: nacional } = useResumo({})
  const media = nacional?.find((r) => r.produto === filtros.produto)?.preco_medio
  const { table, button } = useTableToggle()
  const itens = data?.itens ?? []

  // Barras sempre a partir do zero: o comprimento precisa ser proporcional ao preço.
  // (Cortar o eixo exageraria diferenças de centavos.) Os valores ficam escritos na ponta.
  // A folga de 12% no fim do eixo deixa espaço para o valor escrito depois da barra.
  const domain: [number, number] = [0, Math.max(...itens.map((i) => i.preco_medio), 0) * 1.12]

  return (
    <Panel
      id="por-uf"
      eyebrow="Comparação"
      title="Preço médio por estado"
      description={data?.mes ? `${productLabel(filtros.produto)}, ${formatMonthLong(data.mes)}` : undefined}
      actions={button}
    >
      {isError ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : isPending ? (
        <Skeleton className="h-[600px] w-full" />
      ) : itens.length === 0 ? (
        <EmptyState />
      ) : (
        <ChartOrTable
          table={table}
          tableView={
            <DataTable
              caption="Preço médio por estado"
              head={['Estado', 'Preço médio', 'Coletas']}
              rows={itens.map((i) => [`${i.posicao}. ${i.nome}`, formatPrice(i.preco_medio), formatNumber(i.qtd_coletas, 0)])}
            />
          }
          chart={
            <figure className={`transition-opacity duration-300 ${isPlaceholderData ? 'opacity-60' : ''}`}>
              <figcaption className="sr-only">
                {`Estados ordenados do mais caro (${itens[0].nome}, ${formatPrice(itens[0].preco_medio)}) ao mais barato (${itens[itens.length - 1].nome}, ${formatPrice(itens[itens.length - 1].preco_medio)}). Use "Ver tabela" para todos os valores.`}
              </figcaption>
              {media !== undefined && (
                <p className="mb-3 flex items-center gap-2 text-xs text-muted" aria-hidden="true">
                  <span className="h-3 w-px bg-ink-2" />
                  Média nacional: <span className="tnum font-medium text-ink">{formatPrice(media)}</span>
                  {filtros.uf && (
                    <>
                      <span className="ml-3 size-2 rounded-[2px] bg-[var(--chart-highlight)]" />
                      Estado selecionado
                    </>
                  )}
                </p>
              )}
              <div style={{ height: itens.length * ROW + 8 }} aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={itens} layout="vertical" margin={{ top: 0, right: 4, bottom: 0, left: 0 }} barCategoryGap={4}>
                    <XAxis type="number" domain={domain} hide />
                    <YAxis
                      type="category"
                      dataKey="uf"
                      width={30}
                      interval={0}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'var(--ink-2)', fontSize: 12, fontWeight: 500 }}
                    />
                    <Tooltip content={UfTooltip} cursor={{ fill: 'var(--surface-2)' }} isAnimationActive={false} />
                    <Bar
                      dataKey="preco_medio"
                      maxBarSize={14}
                      radius={[0, 4, 4, 0]}
                      animationDuration={800}
                      animationEasing="ease-out"
                      onClick={(entry) => update({ uf: (entry as unknown as ItemRanking).uf })}
                      className="cursor-pointer"
                    >
                      {itens.map((item) => (
                        <Cell
                          key={item.uf}
                          fill={item.uf === filtros.uf ? 'var(--chart-highlight)' : 'var(--chart-series)'}
                          fillOpacity={filtros.uf && item.uf !== filtros.uf ? 0.45 : 1}
                        />
                      ))}
                      <LabelList
                        dataKey="preco_medio"
                        position="right"
                        offset={6}
                        formatter={(v) => formatNumber(Number(v))}
                        fill="var(--muted)"
                        fontSize={11}
                        className="tnum"
                      />
                    </Bar>
                    {media !== undefined && <ReferenceLine x={media} stroke="var(--ink-2)" strokeOpacity={0.5} strokeWidth={1} ifOverflow="extendDomain" />}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </figure>
          }
        />
      )}
    </Panel>
  )
}
