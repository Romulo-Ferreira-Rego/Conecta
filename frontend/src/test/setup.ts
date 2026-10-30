// Preparação dos testes: o jsdom simula o navegador, mas não tem algumas APIs usadas pelo site.

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { MotionGlobalConfig } from 'motion/react'
import { afterEach, vi } from 'vitest'

// Nos testes, as animações terminam na hora (o jsdom não roda quadros de animação como o navegador).
MotionGlobalConfig.skipAnimations = true

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// Preferências do sistema (tema, menos movimento): nos testes, sempre "não".
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Usado pelos gráficos responsivos do Recharts.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Animações que começam quando o elemento entra na tela (diagrama de "Sobre o projeto").
globalThis.IntersectionObserver = class {
  readonly root = null
  readonly rootMargin = ''
  readonly thresholds = []
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
} as unknown as typeof IntersectionObserver

// <dialog> nativo (gaveta de filtros).
HTMLDialogElement.prototype.showModal = function () {
  this.open = true
}
HTMLDialogElement.prototype.close = function () {
  this.open = false
}
