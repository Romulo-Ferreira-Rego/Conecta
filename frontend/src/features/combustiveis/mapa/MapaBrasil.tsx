import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

import { useMapa } from '../../../api/hooks'
import type { AreaMapa } from '../../../api/types'
import { Panel } from '../../../components/ui/Panel'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/States'
import { EASE_OUT } from '../../../lib/motion'
import { formatMonthLong, formatNumber, formatPercent, formatPrice } from '../../../lib/format'
import { inState, productLabel } from '../../../lib/lugares'
import { ChartOrTable, DataTable } from '../ChartFrame'
import { TrendBadge } from '../TrendBadge'
import { useFiltros } from '../useFiltros'
import { useTableToggle } from '../useTableToggle'
import { FAIXAS_VARIACAO, faixaDe, faixasPreco, type Faixa, type Metrica } from './escala'
import { fitBox, useBrasil, useMunicipiosGeo, VIEWBOX_BRASIL, viewBoxString, type Forma } from './geo'
import { Legenda } from './Legenda'

const METRICAS: { value: Metrica; label: string }[] = [
  { value: 'preco', label: 'Preço' },
  { value: 'variacao', label: 'Variação' },
]

/**
 * Estados pequenos demais para o rótulo caber dentro: o rótulo vai para fora
 * (no mar ou ao lado), ligado ao estado por uma linha fina. Posições em [longitude, latitude].
 */
const ROTULO_FORA: Record<string, [number, number]> = {
  RN: [-33.4, -4.6],
  PB: [-32.6, -6.9],
  PE: [-32.6, -8.7],
  AL: [-33.6, -10.6],
  SE: [-35.0, -12.4],
  ES: [-37.3, -20.0],
  RJ: [-40.0, -23.9],
  DF: [-45.2, -14.3],
}

/** Abaixo desta largura, o mapa do Brasil mostra só as cores (os rótulos não caberiam). */
const LARGURA_ROTULOS = 440

interface Destaque {
  forma: Forma
  item?: AreaMapa
  /** Posição do balão, em px dentro do mapa */
  x: number
  y: number
  /** Estado aberto e métrica de quando o balão apareceu */
  contexto: string
}

/** Mede a largura do mapa na tela (os rótulos precisam de tamanho fixo em px). */
function useLargura() {
  const elemento = useRef<HTMLDivElement | null>(null)
  const [largura, setLargura] = useState(0)
  // "Callback ref": o mapa só aparece depois do carregamento, então a medição começa quando o elemento existe.
  const ref = useCallback((el: HTMLDivElement | null) => {
    elemento.current = el
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setLargura(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return { ref, elemento, largura }
}

function valorDe(item: AreaMapa | undefined, metrica: Metrica): number | null {
  if (!item) return null
  return metrica === 'preco' ? item.preco_medio : item.variacao_percentual
}

/**
 * Mapa coroplético interativo: o Brasil pintado pelo preço médio de cada UF.
 * Clicar num estado dá zoom nele e mostra os municípios; a escolha vai para a URL (?uf=),
 * então o painel inteiro passa a mostrar aquele estado.
 */
export function MapaBrasil() {
  const { filtros, update } = useFiltros()
  const [metrica, setMetrica] = useState<Metrica>('preco')
  const { table, button } = useTableToggle()
  const reduzMovimento = useReducedMotion()
  const patternId = `sem-dados-${useId().replace(/:/g, '')}`
  const { ref, elemento, largura } = useLargura()
  const [balao, setDestaque] = useState<Destaque | null>(null)

  const uf = filtros.uf
  const brasil = useBrasil()
  const dadosUf = useMapa(filtros.produto)
  const dadosMunicipios = useMapa(filtros.produto, uf)
  const geoMunicipios = useMunicipiosGeo(uf, brasil.geo?.projection)

  const estadoAberto = uf ? brasil.geo?.estados.find((e) => e.id === uf) : undefined
  const zoom = estadoAberto ? fitBox(estadoAberto.caixa) : VIEWBOX_BRASIL
  // Quantas unidades do SVG cabem em 1px da tela: mantém rótulos e hachuras do mesmo tamanho em qualquer zoom.
  const porPx = largura ? zoom.w / largura : 1

  const itensUf = useMemo(() => new Map((dadosUf.data?.itens ?? []).map((i) => [i.uf, i])), [dadosUf.data])
  const itensMunicipio = useMemo(
    () =>
      new Map(
        (dadosMunicipios.data?.nivel === 'municipio' ? dadosMunicipios.data.itens : [])
          .filter((i) => i.codigo_ibge !== null)
          .map((i) => [String(i.codigo_ibge), i]),
      ),
    [dadosMunicipios.data],
  )

  // A escala vale para o que está na tela: as UFs, ou os municípios do estado aberto.
  const itensNaTela = uf ? [...itensMunicipio.values()] : [...itensUf.values()]
  const faixas: Faixa[] = metrica === 'preco' ? faixasPreco(itensNaTela.map((i) => i.preco_medio)) : FAIXAS_VARIACAO

  const corDe = (item: AreaMapa | undefined) => {
    const valor = valorDe(item, metrica)
    return valor === null ? `url(#${patternId})` : (faixaDe(valor, faixas)?.cor ?? `url(#${patternId})`)
  }

  // Ao trocar de estado ou de métrica, o balão antigo deixa de valer.
  const contexto = `${uf}|${metrica}`
  const destaque = balao?.contexto === contexto ? balao : null

  const minColetas = dadosUf.data?.min_coletas ?? 10
  const mes = dadosUf.data?.mes
  const produto = productLabel(filtros.produto)
  const nomeEstado = estadoAberto?.nome ?? uf

  const mostrar = (forma: Forma, item: AreaMapa | undefined, x: number, y: number) =>
    setDestaque({ forma, item, x, y, contexto })
  const pelaPosicao = (event: PointerEvent, forma: Forma, item?: AreaMapa) => {
    const rect = elemento.current?.getBoundingClientRect()
    if (rect) mostrar(forma, item, event.clientX - rect.left, event.clientY - rect.top)
  }
  /** Teclado: o balão aparece sobre o centro da forma. */
  const peloCentro = (forma: Forma, item?: AreaMapa) => {
    const escala = largura ? largura / zoom.w : 1
    mostrar(forma, item, (forma.centro[0] - zoom.x) * escala, (forma.centro[1] - zoom.y) * escala)
  }
  const ativar = (event: KeyboardEvent, acao: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      acao()
    }
  }
  const abrirEstado = (sigla: string) => update({ uf: sigla })
  const voltar = () => update({ uf: undefined })
  const escolherMunicipio = (item: AreaMapa) =>
    update({ municipio: filtros.municipio === item.municipio_id ? undefined : (item.municipio_id ?? undefined) })

  const transicao = reduzMovimento ? { duration: 0 } : { duration: 0.9, ease: EASE_OUT }
  const carregando = brasil.isPending || dadosUf.isPending
  const erro = brasil.error ?? dadosUf.error
  const mostrarRotulos = !uf && largura >= LARGURA_ROTULOS
  const totalMunicipios = geoMunicipios.formas?.length

  return (
    <Panel
      id="mapa"
      eyebrow="Mapa"
      title={uf ? `Preço médio por município ${inState(uf, nomeEstado ?? uf)}` : 'Preço médio por estado'}
      description={mes ? `${produto}, ${formatMonthLong(mes)}` : undefined}
      actions={
        <>
          <SegmentedControl label="O que o mapa mostra" options={METRICAS} value={metrica} onChange={setMetrica} size="sm" />
          {button}
        </>
      }
    >
      {erro ? (
        <ErrorState message={erro.message} onRetry={() => (brasil.error ? brasil.refetch() : dadosUf.refetch())} />
      ) : carregando ? (
        <Skeleton className="aspect-[640/620] w-full" />
      ) : itensUf.size === 0 ? (
        <EmptyState />
      ) : (
        <ChartOrTable
          table={table}
          tableView={
            <TabelaMapa
              uf={uf}
              itens={itensNaTela}
              nomeDe={(item) => (uf ? (geoMunicipios.formas?.find((f) => f.id === String(item.codigo_ibge))?.nome ?? item.nome) : item.nome)}
              totalMunicipios={totalMunicipios}
              minColetas={minColetas}
            />
          }
          chart={
            <figure onKeyDown={(e) => e.key === 'Escape' && uf && voltar()}>
              <figcaption className="sr-only">
                {uf
                  ? `Mapa dos municípios ${inState(uf, nomeEstado ?? uf)}: ${itensMunicipio.size} com coletas de ${produto.toLowerCase()} no mês; os demais aparecem como dados insuficientes. Use "Ver tabela" para todos os valores.`
                  : `Mapa do Brasil com o preço médio de ${produto.toLowerCase()} em cada estado. Selecione um estado para ver os municípios. Use "Ver tabela" para todos os valores.`}
              </figcaption>

              {/* Navegação: Brasil › Estado */}
              <div className="mb-3 flex min-h-8 flex-wrap items-center justify-between gap-2">
                <nav aria-label="Nível do mapa" className="flex items-center gap-1.5 text-sm">
                  {uf ? (
                    <>
                      <button
                        type="button"
                        onClick={voltar}
                        className="flex items-center gap-1 rounded-md px-2 py-1 font-medium text-brand-ink transition-colors hover:bg-surface-2"
                      >
                        <span aria-hidden="true">←</span> Brasil
                      </button>
                      <span aria-hidden="true" className="text-muted">/</span>
                      <span aria-current="page" className="px-1 font-medium text-ink">{nomeEstado}</span>
                    </>
                  ) : (
                    <span className="text-muted">Clique em um estado para ver os municípios</span>
                  )}
                </nav>
                {uf && totalMunicipios !== undefined && (
                  <p className="text-xs text-muted">
                    <span className="tnum font-medium text-ink-2">{itensMunicipio.size}</span> de{' '}
                    <span className="tnum">{totalMunicipios}</span> municípios com coletas
                  </p>
                )}
              </div>

              <div ref={ref} className="relative" onPointerLeave={() => setDestaque(null)}>
                <motion.svg
                  viewBox={viewBoxString(VIEWBOX_BRASIL)}
                  initial={false}
                  animate={{ viewBox: viewBoxString(zoom) }}
                  transition={transicao}
                  className="block aspect-[640/620] w-full touch-manipulation select-none"
                  role="group"
                  aria-label={uf ? `Municípios ${inState(uf, nomeEstado ?? uf)}` : 'Estados do Brasil'}
                >
                  <defs>
                    {/* Hachura de "dados insuficientes": não depende só da cor (acessibilidade) */}
                    <pattern
                      id={patternId}
                      patternUnits="userSpaceOnUse"
                      width={6}
                      height={6}
                      patternTransform={`scale(${porPx}) rotate(45)`}
                    >
                      <rect width="6" height="6" fill="var(--map-empty)" />
                      <line x1="0" y1="0" x2="0" y2="6" stroke="var(--map-hatch)" strokeWidth="1.5" />
                    </pattern>
                  </defs>

                  {/* Estados */}
                  <g>
                    {brasil.geo?.estados.map((estado) => {
                      const item = itensUf.get(estado.id)
                      const aberto = estado.id === uf
                      const outro = Boolean(uf) && !aberto
                      return (
                        <path
                          key={estado.id}
                          d={estado.d}
                          fill={uf ? 'var(--map-empty)' : corDe(item)}
                          stroke="var(--surface)"
                          strokeWidth={uf ? 1 : 1.25}
                          vectorEffect="non-scaling-stroke"
                          opacity={outro ? 0.7 : 1}
                          className={`outline-none transition-[fill,opacity] duration-500 ${aberto ? '' : 'cursor-pointer hover:opacity-100'}`}
                          tabIndex={aberto ? -1 : 0}
                          role="button"
                          aria-label={rotuloAcessivel(estado.nome, item, metrica, aberto ? 'aberto' : 'abrir')}
                          onClick={() => !aberto && abrirEstado(estado.id)}
                          onKeyDown={(e) => ativar(e, () => !aberto && abrirEstado(estado.id))}
                          onPointerMove={(e) => !uf && e.pointerType === 'mouse' && pelaPosicao(e, estado, item)}
                          onFocus={() => !uf && peloCentro(estado, item)}
                          onBlur={() => setDestaque(null)}
                        />
                      )
                    })}
                  </g>

                  {/* Municípios do estado aberto (aparecem depois que o zoom chega) */}
                  <AnimatePresence>
                    {uf && geoMunicipios.formas && (
                      <motion.g
                        key={uf}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { delay: reduzMovimento ? 0 : 0.45, duration: 0.4 } }}
                        exit={{ opacity: 0, transition: { duration: 0.2 } }}
                      >
                        {geoMunicipios.formas.map((forma) => {
                          const item = itensMunicipio.get(forma.id)
                          return (
                            <path
                              key={forma.id}
                              d={forma.d}
                              fill={corDe(item)}
                              stroke="var(--surface)"
                              strokeWidth={0.6}
                              vectorEffect="non-scaling-stroke"
                              className={`outline-none ${item ? 'cursor-pointer' : ''}`}
                              tabIndex={item ? 0 : -1}
                              role={item ? 'button' : undefined}
                              aria-label={item ? rotuloAcessivel(forma.nome, item, metrica) : undefined}
                              aria-pressed={item ? filtros.municipio === item.municipio_id : undefined}
                              onClick={() => item && escolherMunicipio(item)}
                              onKeyDown={(e) => item && ativar(e, () => escolherMunicipio(item))}
                              onPointerMove={(e) => e.pointerType === 'mouse' && pelaPosicao(e, forma, item)}
                              onPointerDown={(e) => e.pointerType !== 'mouse' && pelaPosicao(e, forma, item)}
                              onFocus={() => peloCentro(forma, item)}
                              onBlur={() => setDestaque(null)}
                            />
                          )
                        })}
                        {/* Contorno do estado por cima das divisas municipais */}
                        {estadoAberto && (
                          <path d={estadoAberto.d} fill="none" stroke="var(--ink-2)" strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />
                        )}
                      </motion.g>
                    )}
                  </AnimatePresence>

                  {/* Contorno do item em destaque (passou o mouse/foco) e do município escolhido */}
                  <g pointerEvents="none">
                    {uf &&
                      filtros.municipio &&
                      geoMunicipios.formas
                        ?.filter((f) => itensMunicipio.get(f.id)?.municipio_id === filtros.municipio)
                        .map((f) => <path key={f.id} d={f.d} fill="none" stroke="var(--chart-highlight)" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />)}
                    {destaque && (
                      <path d={destaque.forma.d} fill="none" stroke="var(--ink)" strokeWidth={1.75} vectorEffect="non-scaling-stroke" />
                    )}
                  </g>

                  {/* Rótulos: sigla e valor de cada estado */}
                  <AnimatePresence>
                    {mostrarRotulos && brasil.geo && (
                      <motion.g
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { delay: reduzMovimento ? 0 : 0.5 } }}
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                        pointerEvents="none"
                        aria-hidden="true"
                      >
                        {brasil.geo.estados.map((estado) => (
                          <RotuloEstado
                            key={estado.id}
                            estado={estado}
                            item={itensUf.get(estado.id)}
                            metrica={metrica}
                            porPx={porPx}
                            fora={ROTULO_FORA[estado.id] ? (brasil.geo!.projection(ROTULO_FORA[estado.id]) ?? undefined) : undefined}
                          />
                        ))}
                      </motion.g>
                    )}
                  </AnimatePresence>
                </motion.svg>

                {uf && geoMunicipios.isPending && (
                  <p className="absolute inset-x-0 bottom-2 text-center text-xs text-muted" role="status">
                    Carregando municípios…
                  </p>
                )}

                <AnimatePresence>
                  {destaque && (
                    <Balao
                      key={destaque.forma.id}
                      destaque={destaque}
                      largura={largura}
                      uf={uf}
                      produto={produto}
                      mes={mes}
                      minColetas={minColetas}
                    />
                  )}
                </AnimatePresence>
              </div>

              <Legenda faixas={faixas} metrica={metrica} patternId={patternId} />
              {metrica === 'variacao' && dadosUf.data?.mes_anterior && (
                <p className="mt-2 text-xs text-muted">Comparação com {formatMonthLong(dadosUf.data.mes_anterior)}.</p>
              )}
            </figure>
          }
        />
      )}
    </Panel>
  )
}

function textoValor(item: AreaMapa | undefined, metrica: Metrica): string {
  const valor = valorDe(item, metrica)
  if (valor === null) return metrica === 'variacao' && item ? 'sem comparação' : 'dados insuficientes'
  return metrica === 'preco' ? formatPrice(valor) : formatPercent(valor)
}

function rotuloAcessivel(nome: string, item: AreaMapa | undefined, metrica: Metrica, acao?: 'abrir' | 'aberto'): string {
  const sufixo = acao === 'abrir' ? ' (ver municípios)' : acao === 'aberto' ? ' (estado aberto)' : ''
  return `${nome}: ${textoValor(item, metrica)}${sufixo}`
}

function RotuloEstado({
  estado,
  item,
  metrica,
  porPx,
  fora,
}: {
  estado: Forma
  item?: AreaMapa
  metrica: Metrica
  porPx: number
  fora?: [number, number]
}) {
  const valor = valorDe(item, metrica)
  const [x, y] = fora ?? estado.centro
  const texto = valor === null ? '—' : metrica === 'preco' ? formatNumber(valor) : formatPercent(valor)
  return (
    <g>
      {fora && (
        <line
          x1={estado.centro[0]}
          y1={estado.centro[1]}
          x2={x - 2 * porPx * Math.sign(x - estado.centro[0])}
          y2={y}
          stroke="var(--muted)"
          strokeWidth={0.75}
          vectorEffect="non-scaling-stroke"
        />
      )}
      <text
        x={x + (fora && x > estado.centro[0] ? 2 * porPx : fora ? -2 * porPx : 0)}
        y={y}
        textAnchor={fora ? (x > estado.centro[0] ? 'start' : 'end') : 'middle'}
        className="tnum"
        style={{ fontSize: 11 * porPx }}
        // "Halo" da cor do fundo em volta das letras: legível sobre qualquer tom, nos dois temas
        stroke="var(--surface)"
        strokeWidth={2.5 * porPx}
        strokeOpacity={0.8}
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        <tspan x={undefined} dy={-0.15 * 11 * porPx} fill="var(--ink)" fontWeight={650}>
          {estado.id}
        </tspan>
        <tspan
          x={x + (fora && x > estado.centro[0] ? 2 * porPx : fora ? -2 * porPx : 0)}
          dy={1.15 * 11 * porPx}
          fill="var(--ink-2)"
          fontWeight={500}
          style={{ fontSize: 10 * porPx }}
        >
          {texto}
        </tspan>
      </text>
    </g>
  )
}

function Balao({
  destaque,
  largura,
  uf,
  produto,
  mes,
  minColetas,
}: {
  destaque: Destaque
  largura: number
  uf?: string
  produto: string
  mes?: string | null
  minColetas: number
}) {
  const { forma, item, x, y } = destaque
  const paraEsquerda = x > largura / 2 // o balão fica do lado com mais espaço
  return (
    <motion.div
      role="tooltip"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      transition={{ duration: 0.15 }}
      className="pointer-events-none absolute z-10 w-56 rounded-lg border border-line bg-surface px-3 py-2.5 text-xs shadow-[0_8px_24px_-12px_rgb(15_23_42/0.35)]"
      style={{
        left: paraEsquerda ? undefined : x + 14,
        right: paraEsquerda ? largura - x + 14 : undefined,
        top: Math.max(0, y - 20),
      }}
    >
      <p className="font-semibold text-ink">
        {forma.nome}
        {uf && <span className="font-normal text-muted"> ({uf})</span>}
      </p>
      {item ? (
        <>
          <p className="mt-1.5 flex items-baseline justify-between gap-3 text-ink-2">
            Preço médio <span className="tnum text-sm font-semibold text-ink">{formatPrice(item.preco_medio)}</span>
          </p>
          <p className="mt-1 flex items-baseline justify-between gap-3 text-ink-2">
            Mês anterior <TrendBadge percent={item.variacao_percentual} className="!text-xs" />
          </p>
          <p className="mt-1 flex justify-between gap-3 text-muted">
            Coletas <span className="tnum">{formatNumber(item.qtd_coletas, 0)}</span>
          </p>
          {item.qtd_coletas < minColetas && (
            <p className="mt-2 border-t border-line pt-2 text-accent-ink">
              Amostra pequena: poucas coletas no mês, o preço pode não representar a cidade.
            </p>
          )}
          {!uf && <p className="mt-2 border-t border-line pt-2 text-muted">Clique para ver os municípios</p>}
        </>
      ) : (
        <>
          <p className="mt-1.5 font-medium text-ink-2">Dados insuficientes</p>
          <p className="mt-1 text-muted">
            A ANP não coletou preços de {produto.toLowerCase()} aqui{mes ? ` em ${formatMonthLong(mes)}` : ''}.
          </p>
        </>
      )}
    </motion.div>
  )
}

function TabelaMapa({
  uf,
  itens,
  nomeDe,
  totalMunicipios,
  minColetas,
}: {
  uf?: string
  itens: AreaMapa[]
  nomeDe: (item: AreaMapa) => string
  totalMunicipios?: number
  minColetas: number
}) {
  const ordenados = [...itens].sort((a, b) => b.preco_medio - a.preco_medio)
  const semDados = totalMunicipios !== undefined ? totalMunicipios - itens.length : undefined
  return (
    <>
      <DataTable
        caption={uf ? 'Preço médio por município' : 'Preço médio por estado'}
        head={[uf ? 'Município' : 'Estado', 'Preço médio', 'Variação', 'Coletas']}
        rows={ordenados.map((i) => [
          `${nomeDe(i)}${i.qtd_coletas < minColetas ? ' *' : ''}`,
          formatPrice(i.preco_medio),
          i.variacao_percentual === null ? '—' : formatPercent(i.variacao_percentual),
          formatNumber(i.qtd_coletas, 0),
        ])}
      />
      <p className="mt-3 text-xs text-muted">
        {ordenados.some((i) => i.qtd_coletas < minColetas) && `* Amostra pequena (menos de ${minColetas} coletas no mês). `}
        {uf && semDados !== undefined && semDados > 0 && `Os outros ${formatNumber(semDados, 0)} municípios do estado não têm coletas no mês (dados insuficientes).`}
      </p>
    </>
  )
}
