import { Navigate, type RouteObject } from 'react-router'

import { Layout } from './components/layout/Layout'
import { EmBrevePage, NotFoundPage, PageLoading } from './pages/EmBrevePage'

// Rotas organizadas por seção (CLAUDE.md, seção 2.4): "/" fica livre para a futura home de notícias.
// O painel é carregado sob demanda ("lazy"): os gráficos (a parte mais pesada do código)
// só são baixados quando a página é aberta, deixando o primeiro carregamento mais leve.
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Navigate to="/dados/combustiveis" replace /> },
      {
        path: '/dados/combustiveis',
        lazy: async () => ({ Component: (await import('./pages/CombustiveisPage')).CombustiveisPage }),
        HydrateFallback: PageLoading,
      },
      { path: '/sobre-os-dados', element: <EmBrevePage titulo="Sobre os dados" /> },
      { path: '/privacidade', element: <EmBrevePage titulo="Política de Privacidade" /> },
      { path: '/sobre', element: <EmBrevePage titulo="Sobre o projeto" /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
