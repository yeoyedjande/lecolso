import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { API_URL } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { profile } from '@/test/profiles'
import { renderWithQuery } from '@/test/render'

import { LoginForm } from './LoginForm'

async function submit(identifier: string, password: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Téléphone ou e-mail'), identifier)
  await user.type(screen.getByLabelText('Mot de passe'), password)
  await user.click(screen.getByRole('button', { name: 'Se connecter' }))
}

describe('LoginForm', () => {
  it('champs vides : messages locaux, aucun appel', async () => {
    const login = vi.fn()
    server.use(http.post(`${API_URL}/auth/login`, login))
    renderWithQuery(<LoginForm onSuccess={vi.fn()} />)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(
      await screen.findByText('Saisissez votre téléphone ou votre e-mail.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Saisissez votre mot de passe.')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('succès : envoie identifiant, mot de passe et « se souvenir de moi », puis rend le profil', async () => {
    let body: unknown
    server.use(
      http.post(`${API_URL}/auth/login`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ data: profile() })
      }),
    )
    const onSuccess = vi.fn()
    renderWithQuery(<LoginForm onSuccess={onSuccess} />)

    await userEvent.setup().click(screen.getByLabelText('Se souvenir de moi sur cet appareil'))
    await submit('07 00 00 00 03', 'Demo2026!')

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(profile())
    })
    expect(body).toEqual({ login: '07 00 00 00 03', password: 'Demo2026!', remember: true })
  })

  it('422 : message du serveur sur le champ identifiant', async () => {
    server.use(
      http.post(`${API_URL}/auth/login`, () =>
        HttpResponse.json(
          {
            message: 'Identifiant ou mot de passe incorrect.',
            errors: { login: ['Identifiant ou mot de passe incorrect.'] },
          },
          { status: 422 },
        ),
      ),
    )
    renderWithQuery(<LoginForm onSuccess={vi.fn()} />)

    await submit('07 00 00 00 03', 'faux')

    expect(await screen.findByText('Identifiant ou mot de passe incorrect.')).toBeInTheDocument()
    expect(screen.getByLabelText('Téléphone ou e-mail')).toHaveAttribute('aria-invalid', 'true')
  })

  it('429 : invitation à patienter', async () => {
    server.use(
      http.post(`${API_URL}/auth/login`, () =>
        HttpResponse.json(
          { message: 'Trop de tentatives.', code: 'too_many_attempts' },
          { status: 429 },
        ),
      ),
    )
    renderWithQuery(<LoginForm onSuccess={vi.fn()} />)

    await submit('07 00 00 00 03', 'Demo2026!')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Trop de tentatives. Patientez une minute avant de réessayer.',
    )
  })

  it('afficher le mot de passe', async () => {
    renderWithQuery(<LoginForm onSuccess={vi.fn()} />)
    const input = screen.getByLabelText('Mot de passe')
    expect(input).toHaveAttribute('type', 'password')

    await userEvent.setup().click(screen.getByRole('button', { name: 'Afficher le mot de passe' }))

    expect(input).toHaveAttribute('type', 'text')
  })
})
