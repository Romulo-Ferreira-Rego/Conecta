import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders } from '../test/render'
import { PrivacidadePage } from './PrivacidadePage'
import { SobreDadosPage } from './SobreDadosPage'
import { SobreProjetoPage } from './SobreProjetoPage'

const META = {
  ultima_importacao: '2026-10-27T09:00:00-03:00',
  primeira_coleta: '2024-07-01',
  ultima_coleta: '2026-09-30',
  fonte: 'https://www.gov.br/anp',
}

describe('páginas institucionais', () => {
  it('"Sobre os dados" mostra fonte, data de atualização, período e limitações', async () => {
    mockApi({ '/meta': META })
    renderWithProviders(<SobreDadosPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Sobre os dados' })).toBeInTheDocument()
    expect(await screen.findByText('27/10/2026')).toBeInTheDocument()
    expect(screen.getByText('de julho de 2024 a setembro de 2026')).toBeInTheDocument()
    for (const secao of ['Fonte', 'Como o Conecta calcula os números', 'Frequência de atualização', 'Limitações']) {
      expect(screen.getByRole('heading', { level: 2, name: secao })).toBeInTheDocument()
    }
    expect(document.title).toBe('Sobre os dados — Conecta Dados')
  })

  it('a Política de Privacidade tem os 6 itens da seção 7.3 e o contato', () => {
    renderWithProviders(<PrivacidadePage />)
    for (const item of [
      '1. Quem é o responsável',
      '2. Quais dados são tratados e para quê',
      '3. Base legal e tempo de retenção',
      '4. Compartilhamento com terceiros',
      '5. Seus direitos',
      '6. Atualizações desta política',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: item })).toBeInTheDocument()
    }
    expect(screen.getAllByRole('link', { name: 'romulorego16@gmail.com' })[0]).toHaveAttribute(
      'href',
      'mailto:romulorego16@gmail.com',
    )
    expect(screen.getAllByText(/30 de outubro de 2026/).length).toBeGreaterThan(0)
  })

  it('"Sobre o projeto" traz autor, tecnologias e o link do GitHub', () => {
    renderWithProviders(<SobreProjetoPage />)
    expect(screen.getAllByText('Rômulo Ferreira Rego').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'github.com/Romulo-Ferreira-Rego/Conecta' })).toHaveAttribute(
      'href',
      'https://github.com/Romulo-Ferreira-Rego/Conecta',
    )
    expect(screen.getByRole('list', { name: /Caminho dos dados/ })).toBeInTheDocument()
  })
})
