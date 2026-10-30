import { useState } from 'react'

import { useEstados, useMunicipios, useProdutos } from '../../api/hooks'
import { titleCase } from '../../lib/format'
import { productLabel } from '../../lib/lugares'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { Select } from '../../components/ui/Select'
import { Sheet } from '../../components/ui/Sheet'
import { PERIODOS, useFiltros, type Periodo } from './useFiltros'
import { useLocalNome } from './useLocalNome'

function Fields({ idPrefix }: { idPrefix: string }) {
  const { filtros, update } = useFiltros()
  const { data: produtos } = useProdutos()
  const { data: estados } = useEstados()
  const { data: municipios, isFetching: carregandoMunicipios } = useMunicipios(filtros.uf)

  return (
    <>
      <Select
        id={`${idPrefix}-produto`}
        label="Combustível"
        value={filtros.produto}
        onChange={(e) => update({ produto: e.target.value })}
      >
        {(produtos ?? [{ codigo: filtros.produto, nome: '', unidade: '' }]).map((p) => (
          <option key={p.codigo} value={p.codigo}>
            {productLabel(p.codigo)}
          </option>
        ))}
      </Select>

      <Select
        id={`${idPrefix}-uf`}
        label="Estado"
        value={filtros.uf ?? ''}
        onChange={(e) => update({ uf: e.target.value || undefined })}
      >
        <option value="">Brasil (todos)</option>
        {estados?.map((estado) => (
          <option key={estado.sigla} value={estado.sigla}>
            {estado.nome}
          </option>
        ))}
      </Select>

      <Select
        id={`${idPrefix}-municipio`}
        label="Município"
        value={filtros.municipio ?? ''}
        disabled={!filtros.uf || carregandoMunicipios}
        onChange={(e) => update({ municipio: e.target.value ? Number(e.target.value) : undefined })}
      >
        <option value="">{filtros.uf ? 'Todos do estado' : 'Escolha um estado'}</option>
        {municipios?.map((m) => (
          <option key={m.id} value={m.id}>
            {titleCase(m.nome)}
          </option>
        ))}
      </Select>
    </>
  )
}

function PeriodoControl({ fullWidth = false }: { fullWidth?: boolean }) {
  const { filtros, update } = useFiltros()
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">Período do gráfico</span>
      <SegmentedControl<Periodo>
        label="Período do gráfico"
        value={filtros.periodo}
        onChange={(periodo) => update({ periodo })}
        options={PERIODOS.map(({ value, label }) => ({ value, label }))}
        fullWidth={fullWidth}
      />
    </div>
  )
}

/** Barra de filtros: em linha no desktop; no celular, um resumo que abre a gaveta. */
export function FilterBar() {
  const [open, setOpen] = useState(false)
  const { filtros, local } = useFiltros()
  const lugar = useLocalNome(local)
  const ativos = [filtros.uf, filtros.municipio].filter(Boolean).length

  return (
    <div className="sticky top-16 z-30 border-b border-line bg-bg py-3 sm:top-24">
      {/* Desktop */}
      <div className="hidden items-end gap-3 lg:flex">
        <div className="grid flex-1 grid-cols-3 gap-3">
          <Fields idPrefix="barra" />
        </div>
        <PeriodoControl />
      </div>

      {/* Celular e tablet */}
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <p className="min-w-0 truncate text-sm">
          <span className="font-semibold text-ink">{productLabel(filtros.produto)}</span>
          <span className="text-muted"> · {lugar.curto}</span>
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-line-strong bg-surface px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
          </svg>
          Filtros
          {ativos > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-brand text-[11px] font-semibold text-white">{ativos}</span>
          )}
        </button>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Filtros">
        <div className="flex flex-col gap-4">
          <Fields idPrefix="gaveta" />
          <PeriodoControl fullWidth />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 h-11 rounded-lg bg-brand text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Ver resultados
          </button>
        </div>
      </Sheet>
    </div>
  )
}
