import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'

/** Troca suave entre o gráfico e a tabela. */
export function ChartOrTable({ table, chart, tableView }: { table: boolean; chart: ReactNode; tableView: ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={table ? 'tabela' : 'grafico'}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        {table ? tableView : chart}
      </motion.div>
    </AnimatePresence>
  )
}

export function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="max-h-[420px] overflow-auto rounded-lg border border-line">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-surface-2 text-left text-xs text-muted">
          <tr>
            {head.map((h, i) => (
              <th key={h} scope="col" className={`px-3 py-2 font-medium ${i > 0 ? 'text-right' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="tnum divide-y divide-line">
          {rows.map((row) => (
            <tr key={String(row[0])}>
              {row.map((cell, i) => (
                <td key={i} className={`px-3 py-2 ${i > 0 ? 'text-right text-ink-2' : 'text-ink'}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
