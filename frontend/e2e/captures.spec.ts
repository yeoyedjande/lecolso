import { test } from '@playwright/test'

import { openScreen, SCREENS } from './screens.ts'

/**
 * Captures de chaque écran (360 et 1280 px selon le projet), à joindre aux pull requests.
 * Hors de la suite e2e : `npm run e2e:captures` (playwright.captures.config.ts), images dans captures/.
 */

for (const screen of SCREENS) {
  test(`capture : ${screen.name}`, async ({ page }, testInfo) => {
    const width = testInfo.project.use.viewport?.width ?? 0
    await openScreen(page, screen)
    await page.screenshot({ path: `captures/${String(width)}/${screen.name}.png`, fullPage: true })

    if (screen.dark === true && width >= 1280) {
      await openScreen(page, screen, 'dark')
      await page.screenshot({
        path: `captures/${String(width)}/${screen.name}-sombre.png`,
        fullPage: true,
      })
    }
  })
}
