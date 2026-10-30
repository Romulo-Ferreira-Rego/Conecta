import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/**
 * Gaveta que sobe da base da tela (filtros no celular).
 * Usa o <dialog> nativo: o navegador já prende o foco dentro dela,
 * fecha com Esc e torna o resto da página inerte para leitores de tela.
 */
export function Sheet({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      // Espera a animação de saída antes de fechar de fato
      dialog.dataset.closing = ''
      const finish = () => {
        delete dialog.dataset.closing
        dialog.close()
      }
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduce) finish()
      else dialog.addEventListener('animationend', finish, { once: true })
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby="sheet-titulo"
      onCancel={(event) => {
        event.preventDefault() // Esc: fecha com animação
        onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose() // clique no fundo escurecido
      }}
      className="sheet m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-2xl border-t border-line bg-surface p-0 text-ink"
    >
      <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
      <div className="flex items-center justify-between px-5 pt-3 pb-2">
        <h2 id="sheet-titulo" className="text-base font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="grid size-9 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink"
          aria-label="Fechar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="overflow-y-auto px-5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
    </dialog>
  )
}
