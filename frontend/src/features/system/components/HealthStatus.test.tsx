import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { API_URL, healthy } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderWithQuery } from '@/test/render'

import { HealthStatus } from './HealthStatus'

describe('HealthStatus', () => {
  it('affiche « API : OK » quand la base et Redis répondent', async () => {
    renderWithQuery(<HealthStatus />)

    expect(await screen.findByText('API : OK')).toBeInTheDocument()
    expect(screen.getByText('Base de données').nextElementSibling).toHaveTextContent('OK')
    expect(screen.getByText('Redis').nextElementSibling).toHaveTextContent('OK')
  })

  it('affiche le composant en erreur quand l’API répond 503', async () => {
    server.use(
      http.get(`${API_URL}/health`, () =>
        HttpResponse.json({ ...healthy, status: 'error', redis: 'error' }, { status: 503 }),
      ),
    )

    renderWithQuery(<HealthStatus />)

    expect(await screen.findByText('API : indisponible')).toBeInTheDocument()
    expect(screen.getByText('Base de données').nextElementSibling).toHaveTextContent('OK')
    expect(screen.getByText('Redis').nextElementSibling).toHaveTextContent('en erreur')
  })

  it('signale une API injoignable et permet de réessayer', async () => {
    server.use(http.get(`${API_URL}/health`, () => HttpResponse.error()))

    renderWithQuery(<HealthStatus />)

    expect(await screen.findByText('API : injoignable')).toBeInTheDocument()

    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))

    expect(await screen.findByText('API : OK')).toBeInTheDocument()
  })
})
