import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { hasOptionalConsent, openCookiePreferences } from '../../lib/consent'
import { renderWithProviders } from '../../test/render'
import { CookieBanner } from './CookieBanner'

describe('banner de cookies', () => {
  beforeEach(() => localStorage.clear())

  it('aparece na primeira visita com Aceitar e Recusar', async () => {
    renderWithProviders(<CookieBanner />)
    expect(await screen.findByRole('region', { name: 'Aviso de cookies' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aceitar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recusar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade')
  })

  it('recusar é tão fácil quanto aceitar: os botões têm o mesmo estilo', async () => {
    renderWithProviders(<CookieBanner />)
    const aceitar = await screen.findByRole('button', { name: 'Aceitar' })
    const recusar = screen.getByRole('button', { name: 'Recusar' })
    expect(aceitar.className).toBe(recusar.className)
  })

  it('recusar salva a escolha só no navegador, sem cookies, e não libera recursos opcionais', async () => {
    renderWithProviders(<CookieBanner />)
    await userEvent.click(await screen.findByRole('button', { name: 'Recusar' }))
    expect(localStorage.getItem('conecta-cookies')).toBe('recusado')
    expect(document.cookie).toBe('')
    expect(hasOptionalConsent()).toBe(false)
  })

  it('aceitar libera recursos opcionais', async () => {
    renderWithProviders(<CookieBanner />)
    await userEvent.click(await screen.findByRole('button', { name: 'Aceitar' }))
    expect(hasOptionalConsent()).toBe(true)
  })

  it('não aparece de novo depois da escolha, mas pode ser reaberto', async () => {
    localStorage.setItem('conecta-cookies', 'aceito')
    renderWithProviders(<CookieBanner />)
    expect(screen.queryByRole('region', { name: 'Aviso de cookies' })).not.toBeInTheDocument()

    act(() => openCookiePreferences())
    expect(await screen.findByRole('region', { name: 'Aviso de cookies' })).toHaveTextContent(
      'Escolha atual: recursos opcionais aceitos',
    )
  })
})
