import type { SelectHTMLAttributes } from 'react'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
}

/** Select nativo (acessível e ótimo no celular) com visual do site. */
export function Select({ label, id, children, className = '', ...props }: Props) {
  return (
    <label htmlFor={id} className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className="relative">
        <select
          id={id}
          {...props}
          className="h-10 w-full cursor-pointer appearance-none truncate rounded-lg border border-line bg-surface pr-9 pl-3 text-sm text-ink transition-colors hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          {children}
        </select>
        <svg
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </label>
  )
}
