// Renderiza um componente com tudo que ele precisa: cache de dados, rotas e uma API simulada.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { vi } from 'vitest'

type Responses = Record<string, unknown | ((params: URLSearchParams) => unknown)>

/**
 * Simula a API: cada rota (ex.: "/resumo") devolve o valor configurado; "erro" devolve HTTP 500.
 * Arquivos do próprio site (ex.: "/mapas/brasil.json") também podem ser simulados pelo caminho.
 */
export function mockApi(responses: Responses) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost')
    const path = url.pathname.replace(/^\/api/, '')
    const value = responses[path]
    if (value === undefined || value === 'erro') {
      return new Response(JSON.stringify({ detail: 'Falha simulada' }), { status: 500 })
    }
    const body = typeof value === 'function' ? value(url.searchParams) : value
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Mostra a URL atual na tela, para os testes conferirem os filtros. */
function LocationProbe() {
  const location = useLocation()
  return <output data-testid="url">{location.search}</output>
}

export function renderWithProviders(ui: ReactNode, { url = '/' } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <>
            {ui}
            <LocationProbe />
          </>
        ),
      },
    ],
    { initialEntries: [url] },
  )
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}
