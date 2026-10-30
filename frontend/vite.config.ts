import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Lê o .env da raiz do projeto (só variáveis com prefixo VITE_ chegam ao navegador).
  envDir: '..',
  build: {
    // O pacote principal (React + rotas + animações) tem ~505 kB (~160 kB comprimido);
    // os gráficos já ficam num pacote separado, carregado só no painel.
    chunkSizeWarningLimit: 550,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
