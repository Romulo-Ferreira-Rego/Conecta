import { AnimatePresence, motion } from 'motion/react'

import { useMeta } from '../../api/hooks'
import { formatMonthShort } from '../../lib/format'
import { EASE_OUT } from '../../lib/motion'
import { adjustRange, addMonths, listMonths, MIN_MESES, toMonth } from '../../lib/periodo'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { Select } from '../../components/ui/Select'
import { PERIODO_PADRAO, PERIODOS, resolverPeriodo, useFiltros, type Periodo } from './useFiltros'

/** "2026-09" -> "set/2026" */
function monthLabel(month: string): string {
  const short = formatMonthShort(`${month}-01`)
  return `${short.slice(0, 3)}/${month.slice(0, 4)}`
}

/**
 * Período do gráfico de evolução: atalhos prontos ou um intervalo personalizado
 * (mínimo de 3 meses, dentro dos dados disponíveis).
 */
export function PeriodoControl({ idPrefix, fullWidth = false }: { idPrefix: string; fullWidth?: boolean }) {
  const { filtros, update } = useFiltros()
  const { data: meta } = useMeta()
  const primeiro = meta?.primeira_coleta ? toMonth(meta.primeira_coleta) : undefined
  const ultimo = meta?.ultima_coleta ? toMonth(meta.ultima_coleta) : undefined
  const bounds = primeiro && ultimo ? { primeiro, ultimo } : undefined
  const months = bounds ? listMonths(bounds.primeiro, bounds.ultimo) : []
  // Personalizado só é possível se houver dados para ao menos o mínimo de meses
  const podePersonalizar = months.length >= MIN_MESES

  const atual = resolverPeriodo(filtros, meta?.primeira_coleta, meta?.ultima_coleta)
  // Se o intervalo da URL não cabe nos dados, o gráfico usa o padrão; o controle mostra o mesmo.
  const foraDosDados = filtros.periodo === 'personalizado' && !!bounds && !atual.personalizado
  const periodoExibido: Periodo = foraDosDados ? PERIODO_PADRAO : filtros.periodo
  const inicio = atual.personalizado ? atual.inicio : (atual.inicio ?? primeiro)
  const fim = atual.personalizado ? atual.fim : ultimo

  function selectPeriodo(periodo: Periodo) {
    if (periodo !== 'personalizado') {
      update({ periodo, inicio: undefined, fim: undefined })
      return
    }
    if (!bounds || !inicio || !fim) return
    // Começa pelo intervalo que já estava na tela (ex.: últimos 12 meses)
    update({ periodo, ...adjustRange(inicio, fim, 'inicio', bounds) })
  }

  function changeEnd(side: 'inicio' | 'fim', value: string) {
    if (!bounds || !inicio || !fim) return
    const range = side === 'inicio' ? adjustRange(value, fim, 'inicio', bounds) : adjustRange(inicio, value, 'fim', bounds)
    update({ periodo: 'personalizado', ...range })
  }

  // Na gaveta do celular (largura total), rótulos curtos para as 5 opções caberem em 360 px
  const opcoes = PERIODOS.filter((p) => p.value !== 'personalizado' || podePersonalizar).map((p) => ({
    value: p.value,
    label: fullWidth ? p.short : p.label,
  }))

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">Período do gráfico</span>
      <SegmentedControl<Periodo>
        label="Período do gráfico"
        value={periodoExibido}
        onChange={selectPeriodo}
        options={opcoes}
        fullWidth={fullWidth}
      />

      <AnimatePresence initial={false}>
        {periodoExibido === 'personalizado' && inicio && fim && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Select
                id={`${idPrefix}-inicio`}
                label="De"
                value={inicio}
                onChange={(e) => changeEnd('inicio', e.target.value)}
              >
                {months.map((m) => (
                  // Não deixa escolher um início sem espaço para o mínimo de meses até o fim dos dados
                  <option key={m} value={m} disabled={!!ultimo && m > addMonths(ultimo, -(MIN_MESES - 1))}>
                    {monthLabel(m)}
                  </option>
                ))}
              </Select>
              <Select id={`${idPrefix}-fim`} label="Até" value={fim} onChange={(e) => changeEnd('fim', e.target.value)}>
                {months.map((m) => (
                  // Meses que deixariam o intervalo com menos de 3 meses ficam desabilitados
                  <option key={m} value={m} disabled={m < addMonths(inicio, MIN_MESES - 1)}>
                    {monthLabel(m)}
                  </option>
                ))}
              </Select>
            </div>
            <p className="mt-1.5 text-[11px] text-muted">Mínimo de {MIN_MESES} meses. Vale só para o gráfico de evolução.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
