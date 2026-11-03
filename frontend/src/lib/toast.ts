/**
 * Notifications éphémères (toasts) : file en mémoire, affichée par <Toaster /> (components/ui/toast.tsx).
 * Les textes passés ici viennent toujours d'i18n.
 */
export type ToastTone = 'default' | 'success' | 'error'

export interface ToastMessage {
  id: number
  title: string
  description?: string
  tone: ToastTone
}

type Listener = (toasts: ToastMessage[]) => void

let toasts: ToastMessage[] = []
let nextId = 1
const listeners = new Set<Listener>()

function emit(): void {
  listeners.forEach((listener) => {
    listener(toasts)
  })
}

export function toast(
  title: string,
  options: { description?: string; tone?: ToastTone } = {},
): void {
  toasts = [
    ...toasts,
    {
      id: nextId++,
      title,
      tone: options.tone ?? 'default',
      ...(options.description === undefined ? {} : { description: options.description }),
    },
  ]
  emit()
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((item) => item.id !== id)
  emit()
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener)
  listener(toasts)
  return () => {
    listeners.delete(listener)
  }
}
