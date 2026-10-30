import { useState } from 'react'

/** Só o que os tooltips usam das propriedades que o Recharts entrega. */
export interface TooltipLike {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
}

/** Botão "Ver tabela / Ver gráfico": todo gráfico tem uma versão em tabela (acessibilidade). */
export function useTableToggle() {
  const [table, setTable] = useState(false)
  const button = (
    <button
      type="button"
      onClick={() => setTable((t) => !t)}
      aria-pressed={table}
      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        {table ? (
          <path d="M3 3v18h18M7 14l4-4 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M3 5h18M3 12h18M3 19h18M9 5v14" strokeLinecap="round" />
        )}
      </svg>
      {table ? 'Ver gráfico' : 'Ver tabela'}
    </button>
  )
  return { table, button }
}
