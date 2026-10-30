// Tema claro/escuro. A escolha manual fica no localStorage; sem ela, segue o sistema operacional.

import { useCallback, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'

export type Theme = 'light' | 'dark'
const STORAGE_KEY = 'conecta-tema'

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme === 'dark' ? 'escuro' : 'claro')
  } catch {
    // navegação privada pode bloquear o localStorage; o tema só não fica salvo
  }
  listeners.forEach((listener) => listener())
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => 'light' as Theme)

  /** Troca o tema com uma revelação circular a partir do ponto clicado (quando o navegador suporta). */
  const toggle = useCallback((origin?: { x: number; y: number }) => {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark'
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || reduceMotion || !origin) {
      applyTheme(next)
      return
    }
    const radius = Math.hypot(
      Math.max(origin.x, innerWidth - origin.x),
      Math.max(origin.y, innerHeight - origin.y),
    )
    const transition = document.startViewTransition(() => flushSync(() => applyTheme(next)))
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${radius}px at ${origin.x}px ${origin.y}px)`] },
        { duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
      )
    })
  }, [])

  return { theme, toggle }
}
