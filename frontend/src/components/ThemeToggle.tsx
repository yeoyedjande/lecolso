import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { setTheme, useTheme } from '@/lib/theme'

/** Bascule clair / sombre (back-office uniquement). */
export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={t(next === 'dark' ? 'common.theme.toDark' : 'common.theme.toLight')}
      onClick={() => {
        setTheme(next)
      }}
    >
      {theme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  )
}
