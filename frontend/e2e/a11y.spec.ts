import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { openScreen, SCREENS } from './screens.ts'

// Règles WCAG 2.1 A et AA (contrastes, libellés, structure)
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

for (const screen of SCREENS) {
  for (const theme of screen.dark === true ? (['light', 'dark'] as const) : (['light'] as const)) {
    test(`accessibilité : ${screen.name} (${theme === 'dark' ? 'sombre' : 'clair'})`, async ({
      page,
    }) => {
      await openScreen(page, screen, theme)

      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()

      expect(
        results.violations.map(
          (violation) =>
            `${violation.id} : ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
        ),
      ).toEqual([])
    })
  }
}
