import { animate, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'

interface Props {
  value: number
  format: (value: number) => string
  className?: string
}

/**
 * Número que "rola" suavemente do valor anterior ao novo quando um filtro muda.
 * Leitores de tela recebem só o valor final (texto oculto), não os intermediários.
 */
export function AnimatedNumber({ value, format, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const previous = useRef(value)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const from = previous.current
    previous.current = value
    if (reduceMotion || from === value) {
      node.textContent = format(value)
      return
    }
    const controls = animate(from, value, {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        node.textContent = format(latest)
      },
    })
    return () => controls.stop()
  }, [value, format, reduceMotion])

  return (
    <>
      <span ref={ref} className={className} aria-hidden="true">
        {format(value)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </>
  )
}
