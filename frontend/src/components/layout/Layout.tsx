import { Outlet, ScrollRestoration } from 'react-router'

import { CookieBanner } from './CookieBanner'
import { Footer } from './Footer'
import { Header } from './Header'
import { ServerWaking } from './ServerWaking'

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo" className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <Footer />
      <CookieBanner />
      <ServerWaking />
      <ScrollRestoration />
    </div>
  )
}
