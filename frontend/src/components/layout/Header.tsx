import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router'

import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'

// Editorias do portal. Novas seções (Economia, Cidades...) entram aqui no futuro (v4).
const NAV = [
  { to: '/dados/combustiveis', label: 'Combustíveis' },
  { to: '/sobre-os-dados', label: 'Sobre os dados' },
  { to: '/sobre', label: 'Sobre o projeto' },
]

const TODAY = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date())

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg">
      {/* Linha de data, como no topo de um jornal */}
      <div className="hidden border-b border-line sm:block">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-4 text-xs text-muted sm:px-6 lg:px-8">
          <span className="first-letter:uppercase">{TODAY}</span>
          <span>Dados abertos · ANP</span>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="Conecta — página inicial" className="rounded-md">
          <Logo section="Dados" />
        </Link>

        <nav aria-label="Principal" className="flex items-center gap-1">
          <ul className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `relative block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? 'text-ink' : 'text-ink-2 hover:text-ink'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {item.label}
                      {isActive && (
                        <motion.span
                          layoutId="nav-underline"
                          className="absolute inset-x-3 -bottom-[13px] h-[2px] rounded-full bg-brand"
                          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="menu-celular"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            className="grid size-9 place-items-center rounded-md text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink md:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <motion.path animate={menuOpen ? { d: 'M6 6l12 12' } : { d: 'M4 8h16' }} transition={{ duration: 0.25 }} />
              <motion.path animate={menuOpen ? { d: 'M6 18 18 6' } : { d: 'M4 16h16' }} transition={{ duration: 0.25 }} />
            </svg>
          </button>
        </nav>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            id="menu-celular"
            aria-label="Principal (celular)"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-line md:hidden"
          >
            <ul className="px-4 py-2">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between border-b border-line py-3.5 text-[15px] font-medium last:border-0 ${
                        isActive ? 'text-brand-ink' : 'text-ink'
                      }`
                    }
                  >
                    {item.label}
                    <span aria-hidden="true" className="text-muted">→</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
