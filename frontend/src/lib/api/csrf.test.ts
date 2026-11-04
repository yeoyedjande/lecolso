import { describe, expect, it } from 'vitest'

import { csrfCookieUrlFor } from './csrf'

describe('csrfCookieUrlFor', () => {
  it('même origine (staging, production) : chemin relatif servi par le proxy', () => {
    expect(csrfCookieUrlFor('/api/v1')).toBe('/sanctum/csrf-cookie')
  })

  it('API sur une autre origine (développement local) : racine de cette origine', () => {
    expect(csrfCookieUrlFor('http://localhost:8080/api/v1')).toBe(
      'http://localhost:8080/sanctum/csrf-cookie',
    )
  })
})
