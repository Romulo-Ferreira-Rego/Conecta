// Consentimento para recursos opcionais (LGPD, seção 7.2 do CLAUDE.md).
//
// Hoje o site NÃO usa nenhum cookie ou rastreador opcional: só guarda a preferência
// de tema, que é essencial. A escolha fica salva só no navegador e vale para qualquer
// recurso opcional no futuro (ex.: estatísticas de visitas): ele só pode ser
// carregado se `hasOptionalConsent()` for verdadeiro.

import { useSyncExternalStore } from 'react'

export type Consent = 'aceito' | 'recusado'
const STORAGE_KEY = 'conecta-cookies'

const listeners = new Set<() => void>()
let preferencesOpen = false

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function readConsent(): Consent | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'aceito' || value === 'recusado' ? value : null
  } catch {
    return null
  }
}

export function saveConsent(consent: Consent) {
  try {
    localStorage.setItem(STORAGE_KEY, consent)
  } catch {
    // navegação privada pode bloquear o localStorage; a escolha vale só nesta visita
  }
  preferencesOpen = false
  emit()
}

/** Reabre o aviso (link "Preferências de cookies" no rodapé). */
export function openCookiePreferences() {
  preferencesOpen = true
  emit()
}

/** Recursos opcionais só podem rodar com consentimento explícito. */
export function hasOptionalConsent(): boolean {
  return readConsent() === 'aceito'
}

export function useCookieBanner() {
  const consent = useSyncExternalStore(subscribe, readConsent, () => null)
  const reopened = useSyncExternalStore(subscribe, () => preferencesOpen, () => false)
  return { consent, visible: consent === null || reopened }
}
