import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { API_URL } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderWithQuery } from '@/test/render'

import { ChangePasswordForm } from './ChangePasswordForm'

async function fill(current: string, password: string, confirmation: string) {
  const user = userEvent.setup()
  if (current !== '') await user.type(screen.getByLabelText('Mot de passe actuel'), current)
  if (password !== '') await user.type(screen.getByLabelText('Nouveau mot de passe'), password)
  if (confirmation !== '')
    await user.type(screen.getByLabelText('Confirmez le nouveau mot de passe'), confirmation)
  await user.click(screen.getByRole('button', { name: 'Enregistrer le mot de passe' }))
}

describe('ChangePasswordForm', () => {
  it('règles locales : actuel requis, 8 caractères, confirmation identique', async () => {
    renderWithQuery(<ChangePasswordForm required onSuccess={vi.fn()} />)

    await fill('', 'court', 'autre')

    expect(await screen.findByText('Saisissez votre mot de passe actuel.')).toBeInTheDocument()
    expect(
      screen.getByText('Le mot de passe doit contenir au moins 8 caractères.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Les deux mots de passe ne correspondent pas.')).toBeInTheDocument()
  })

  it('nouveau mot de passe identique à l’actuel : refusé', async () => {
    renderWithQuery(<ChangePasswordForm required onSuccess={vi.fn()} />)

    await fill('Provisoire1', 'Provisoire1', 'Provisoire1')

    expect(
      await screen.findByText('Le nouveau mot de passe doit être différent de l’actuel.'),
    ).toBeInTheDocument()
  })

  it('422 du serveur : message sur le champ concerné', async () => {
    server.use(
      http.post(`${API_URL}/auth/password`, () =>
        HttpResponse.json(
          {
            message: 'Le mot de passe est incorrect.',
            errors: { current_password: ['Le mot de passe est incorrect.'] },
          },
          { status: 422 },
        ),
      ),
    )
    renderWithQuery(<ChangePasswordForm required onSuccess={vi.fn()} />)

    await fill('pas-le-bon', 'Abidjan-Cocody-2026', 'Abidjan-Cocody-2026')

    expect(await screen.findByText('Le mot de passe est incorrect.')).toBeInTheDocument()
    expect(screen.getByLabelText('Mot de passe actuel')).toHaveAttribute('aria-invalid', 'true')
  })

  it('succès : indicateur de robustesse puis rappel', async () => {
    server.use(
      http.post(`${API_URL}/auth/password`, () => new HttpResponse(null, { status: 204 })),
      http.get(`${API_URL}/me`, () =>
        HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 }),
      ),
    )
    const onSuccess = vi.fn()
    renderWithQuery(<ChangePasswordForm required={false} onSuccess={onSuccess} />)

    await fill('Provisoire1', 'Abidjan-Cocody-2026', 'Abidjan-Cocody-2026')

    expect(screen.getByText('Robustesse : excellente')).toBeInTheDocument()
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })
})
