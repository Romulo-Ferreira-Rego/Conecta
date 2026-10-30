import { Navigate, type RouteObject } from 'react-router'

import { Layout } from './components/layout/Layout'
import { NotFoundPage, PageLoading } from './pages/SistemaPages'
import { PrivacidadePage } from './pages/PrivacidadePage'
import { SobreDadosPage } from './pages/SobreDadosPage'
import { SobreProjetoPage } from './pages/SobreProjetoPage'

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
      { path: '/sobre-os-dados', element: <SobreDadosPage /> },
      { path: '/privacidade', element: <PrivacidadePage /> },
      { path: '/sobre', element: <SobreProjetoPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
