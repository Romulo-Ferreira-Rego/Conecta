import { act, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useMeta } from '../../api/hooks'
import { renderWithProviders } from '../../test/render'
import { ServerWaking, WAKING_DELAY_MS } from './ServerWaking'

function Pagina() {
  useMeta() // dispara uma requisição
  return <ServerWaking />
}

describe('aviso de servidor acordando', () => {
  afterEach(() => vi.useRealTimers())

  it('aparece só se a resposta demorar mais que 5 segundos, e some quando ela chega', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let responder: (r: Response) => void = () => {}
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => (responder = resolve))))

    renderWithProviders(<Pagina />)
    await act(() => vi.advanceTimersByTimeAsync(WAKING_DELAY_MS - 500))
    expect(screen.queryByText(/Conectando ao servidor/)).not.toBeInTheDocument()

    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(screen.getByText(/Conectando ao servidor/).closest('[role=status]')).toBeInTheDocument()

    vi.useRealTimers() // a animação de saída usa o relógio real
    await act(async () => {
      responder(new Response(JSON.stringify({ ultima_importacao: null, primeira_coleta: null, ultima_coleta: null, fonte: '' })))
    })
    await waitFor(() => expect(screen.queryByText(/Conectando ao servidor/)).not.toBeInTheDocument())
  })
})
