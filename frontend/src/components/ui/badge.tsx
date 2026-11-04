import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import * as React from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap [&>svg]:size-3.5',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'border-border text-foreground',
        success: 'bg-success-soft text-success-ink',
        destructive: 'bg-destructive-soft text-destructive-ink',
        accent: 'bg-orange-100 text-accent-ink dark:bg-orange/20',
        daycare: 'bg-cycle-daycare-soft text-cycle-daycare-ink',
        kindergarten: 'bg-cycle-kindergarten-soft text-cycle-kindergarten-ink',
        primary: 'bg-cycle-primary-soft text-cycle-primary-ink',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span'

  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

// eslint-disable-next-line react-refresh/only-export-components -- convention shadcn/ui
export { Badge, badgeVariants }
