import '@fontsource-variable/inter' // fonte hospedada no próprio site (sem enviar o IP do visitante ao Google)
import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
