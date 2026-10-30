import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { ESTADOS } from '../../test/fixtures'
import { mockApi, renderWithProviders } from '../../test/render'
import { FilterBar } from './FilterBar'

function api() {
  return mockApi({
    '/produtos': [
      { codigo: 'gasolina', nome: 'GASOLINA', unidade: 'R$ / litro' },
      { codigo: 'etanol', nome: 'ETANOL', unidade: 'R$ / litro' },
    ],
    '/estados': ESTADOS,
    '/municipios': (params: URLSearchParams) =>
      params.get('uf') === 'MA'
        ? [{ id: 7, nome: 'SAO LUIS', uf: 'MA' }, { id: 8, nome: 'IMPERATRIZ', uf: 'MA' }]
        : [{ id: 9, nome: 'CAMPINAS', uf: 'SP' }],
  })
}

describe('barra de filtros', () => {
  it('guarda as escolhas na URL', async () => {
    api()
    renderWithProviders(<FilterBar />)

    const estado = screen.getAllByLabelText('Estado')[0]
    await screen.findAllByRole('option', { name: 'Maranhão' })
    await userEvent.selectOptions(estado, 'MA')
    expect(screen.getByTestId('url')).toHaveTextContent('?uf=MA')

    await userEvent.selectOptions(screen.getAllByLabelText('Combustível')[0], 'etanol')
    expect(screen.getByTestId('url')).toHaveTextContent('?produto=etanol&uf=MA')
  })

  it('lista os municípios da UF escolhida, com nomes legíveis', async () => {
    api()
    renderWithProviders(<FilterBar />, { url: '/?uf=MA' })
    expect(await screen.findAllByRole('option', { name: 'Sao Luis' })).not.toHaveLength(0)
  })

  it('município fica desabilitado até escolher um estado', async () => {
    api()
    renderWithProviders(<FilterBar />)
    expect(screen.getAllByLabelText('Município')[0]).toBeDisabled()
  })

  it('trocar o estado limpa o município escolhido', async () => {
    api()
    renderWithProviders(<FilterBar />, { url: '/?uf=MA&municipio=7' })
    await screen.findAllByRole('option', { name: 'São Paulo' })
    await userEvent.selectOptions(screen.getAllByLabelText('Estado')[0], 'SP')
    expect(screen.getByTestId('url')).toHaveTextContent('?uf=SP')
    expect(screen.getByTestId('url')).not.toHaveTextContent('municipio')
  })

  it('no celular, o botão Filtros abre a gaveta e mostra quantos filtros estão ativos', async () => {
    api()
    renderWithProviders(<FilterBar />, { url: '/?uf=MA&municipio=7' })
    const botao = screen.getByRole('button', { name: /Filtros/ })
    expect(botao).toHaveTextContent('2')

    await userEvent.click(botao)
    const dialog = document.querySelector('dialog')!
    expect(dialog.open).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'Ver resultados' }))
    await waitFor(() => expect(dialog.dataset.closing).toBeDefined())
  })
})
