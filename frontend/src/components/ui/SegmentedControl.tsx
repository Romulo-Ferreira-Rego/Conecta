import { motion } from 'motion/react'
import { useId } from 'react'

interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  label: string
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  /** Ocupa toda a largura, dividindo o espaço entre as opções (celular). */
  fullWidth?: boolean
}

/** Grupo de opções com o indicador deslizando até a escolhida (animação de layout compartilhado). */
export function SegmentedControl<T extends string>({ label, options, value, onChange, size = 'md', fullWidth = false }: Props<T>) {
  const id = useId()
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`rounded-lg border border-line bg-surface-2 p-0.5 ${fullWidth ? 'flex w-full [&>*]:flex-1 [&>*]:px-1' : 'inline-flex'}`}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`relative rounded-md font-medium whitespace-nowrap transition-colors ${
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
            } ${active ? 'text-ink' : 'text-muted hover:text-ink-2'}`}
          >
            {active && (
              <motion.span
                layoutId={`segmento-${id}`}
                className="absolute inset-0 rounded-md bg-surface shadow-[0_1px_2px_rgb(15_23_42/0.08),0_0_0_1px_var(--line)]"
                transition={{ type: 'spring', stiffness: 520, damping: 40 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
