// Estados de carregamento, vazio e erro (CLAUDE.md, seção 8.5).

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-surface-2 [animation-duration:1.6s] ${className}`}
    />
  )
}

export function EmptyState({ message = 'Sem dados para este filtro.', hint }: { message?: string; hint?: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-1.5 px-4 py-8 text-center">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-line-strong" aria-hidden="true">
        <path d="M3 3v18h18" strokeLinecap="round" />
        <path d="M7 15h2M11 15h2M15 15h2" strokeLinecap="round" strokeDasharray="0.1 3.9" />
      </svg>
      <p className="text-sm font-medium text-ink">{message}</p>
      {hint && <p className="max-w-xs text-sm text-muted">{hint}</p>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex min-h-40 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
      <p className="text-sm font-medium text-ink">Não foi possível carregar estes dados.</p>
      {message && <p className="max-w-sm text-sm text-muted">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-line-strong px-3.5 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
        >
          Tentar de novo
        </button>
      )}
    </div>
  )
}
