import { motion, MotionConfig, useReducedMotion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'

/** Animations désactivées automatiquement si prefers-reduced-motion. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}

/**
 * Apparition douce (cartes, sections), en cascade légère avec `index`.
 * Volontairement brève (≈ 0,2 s au plus pour la dernière carte) : le contenu doit paraître immédiat.
 */
export function Reveal({ index = 0, ...props }: HTMLMotionProps<'div'> & { index?: number }) {
  // Mouvement réduit : affichage immédiat (motion conserverait sinon le fondu d'opacité)
  const reduce = useReducedMotion() ?? false
  if (reduce) return <motion.div {...props} />
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, delay: Math.min(index, 4) * 0.02, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    />
  )
}

/** Transition d'entrée d'une page : très courte, pour ne pas retarder l'affichage du contenu. */
export function PageTransition(props: HTMLMotionProps<'div'>) {
  const reduce = useReducedMotion() ?? false
  if (reduce) return <motion.div {...props} />
  return (
    <motion.div
      initial={{ opacity: 0.4 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      {...props}
    />
  )
}
