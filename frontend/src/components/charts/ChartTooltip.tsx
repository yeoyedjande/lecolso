import type { ReactNode } from 'react'

/** Infobulle des graphiques : surface du thème, valeurs en encre de texte. */
export function ChartTooltip({
  active,
  title,
  rows,
}: {
  active?: boolean | undefined
  title: ReactNode
  rows: { label: ReactNode; value: ReactNode; color?: string }[]
}) {
  if (active !== true) return null
  return (
    <div className="grid min-w-36 gap-1.5 rounded-xl border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lift">
      <p className="font-semibold">{title}</p>
      {rows.map((row, index) => (
        <p key={index} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-muted-foreground">
            {row.color !== undefined && <span aria-hidden className="size-2.5 rounded-full" style={{ background: row.color }} />}
            {row.label}
          </span>
          <span className="tabular font-semibold">{row.value}</span>
        </p>
      ))}
    </div>
  )
}
