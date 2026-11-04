import { useTheme } from '@/lib/theme'

/** Couleurs des graphiques Recharts, alignées sur les tokens (grilles et axes discrets). */
export function useChartTheme() {
  const theme = useTheme()
  const dark = theme === 'dark'
  return {
    dark,
    series: dark ? '#F28C28' : '#1B2559',
    line: dark ? '#93B8FB' : '#1B2559',
    grid: dark ? 'rgb(255 255 255 / 0.08)' : '#EFE9DF',
    axis: dark ? '#AAB3D9' : '#5C544A',
    surface: dark ? '#161D42' : '#FFFFFF',
  }
}
