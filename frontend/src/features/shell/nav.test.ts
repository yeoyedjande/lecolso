import { describe, expect, it } from 'vitest'

import { membership } from '@/test/profiles'

import { BACK_OFFICE_NAV, visibleSections } from './nav'

function keys(permissions: Record<string, string[] | null>) {
  return visibleSections(BACK_OFFICE_NAV, membership({ permissions })).flatMap((section) =>
    section.items.map((item) => item.key),
  )
}

describe('menu du back-office', () => {
  it('comptabilité : finances et messages, ni notes ni paramètres', () => {
    const items = keys({
      'students.view': null,
      'billing.view': null,
      'billing.manage': null,
      'messaging.send': null,
    })
    expect(items).toEqual(
      expect.arrayContaining([
        'dashboard',
        'students',
        'payments',
        'unpaid',
        'cashDesk',
        'fees',
        'messages',
      ]),
    )
    expect(items).not.toContain('grades')
    expect(items).not.toContain('settings')
    expect(items).not.toContain('enrollment')
  })

  it('une section sans entrée permise disparaît', () => {
    const sections = visibleSections(BACK_OFFICE_NAV, membership({ permissions: {} })).map(
      (section) => section.key,
    )
    expect(sections).toEqual(['pilotage', 'daily'])
  })
})
