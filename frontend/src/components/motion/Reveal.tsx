import { motion, MotionConfig, useReducedMotion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'

/** Animations désactivées automatiquement si prefers-reduced-motion. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}

/** Apparition douce (cartes, sections), en cascade avec `index`. */
export function Reveal({ index = 0, ...props }: HTMLMotionProps<'div'> & { index?: number }) {
  // Mouvement réduit : affichage immédiat (motion conserverait sinon le fondu d'opacité)
  const reduce = useReducedMotion() ?? false
  if (reduce) return <motion.div {...props} />
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.05, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    />
  )
}

/** Transition d'entrée d'une page. */
export function PageTransition(props: HTMLMotionProps<'div'>) {
  const reduce = useReducedMotion() ?? false
  if (reduce) return <motion.div {...props} />
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    />
  )
}
