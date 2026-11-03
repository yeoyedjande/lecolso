import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { Toast as ToastPrimitive } from 'radix-ui'
import { useEffect, useState } from 'react'

import { dismissToast, subscribeToasts, type ToastMessage } from '@/lib/toast'
import { cn } from '@/lib/utils'

/** Affiche les toasts émis par toast() (lib/toast.ts), annoncés aux lecteurs d'écran. */
function Toaster({ closeLabel }: { closeLabel: string }) {
  const [items, setItems] = useState<ToastMessage[]>([])

  useEffect(() => subscribeToasts(setItems), [])

  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
      {items.map((item) => {
        const Icon =
          item.tone === 'success' ? CircleCheck : item.tone === 'error' ? CircleAlert : Info
        return (
          <ToastPrimitive.Root
            key={item.id}
            onOpenChange={(open) => {
              if (!open) dismissToast(item.id)
            }}
            className={cn(
              'flex items-start gap-3 rounded-2xl border bg-popover p-4 text-popover-foreground shadow-lift data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            )}
          >
            <Icon
              aria-hidden
              className={cn(
                'mt-0.5 size-5 shrink-0',
                item.tone === 'success' && 'text-success-ink',
                item.tone === 'error' && 'text-destructive-ink',
                item.tone === 'default' && 'text-accent-ink',
              )}
            />
            <div className="grid flex-1 gap-1">
              <ToastPrimitive.Title className="text-sm font-semibold">
                {item.title}
              </ToastPrimitive.Title>
              {item.description !== undefined && (
                <ToastPrimitive.Description className="text-sm text-muted-foreground">
                  {item.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close
              aria-label={closeLabel}
              className="-m-1 rounded-lg p-1 text-muted-foreground hover:bg-secondary"
            >
              <span aria-hidden>×</span>
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        )
      })}
      <ToastPrimitive.Viewport className="fixed right-0 bottom-0 z-[100] flex w-full max-w-sm flex-col gap-2 p-4 outline-none" />
    </ToastPrimitive.Provider>
  )
}

export { Toaster }
