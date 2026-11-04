import { animate, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

/**
 * Compteur animé (indicateurs du tableau de bord). La valeur finale est toujours celle annoncée aux
 * lecteurs d'écran ; l'animation est coupée si l'utilisateur préfère réduire les mouvements.
 */
export function AnimatedNumber({
  value,
  format,
}: {
  value: number
  format: (value: number) => string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion() ?? false
  const [animated, setAnimated] = useState(0)

  useEffect(() => {
    if (!inView || reduce) return
    const controls = animate(0, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        setAnimated(Math.round(latest))
      },
    })
    return () => {
      controls.stop()
    }
  }, [inView, reduce, value])

  // Sans animation : valeur finale directement
  const display = reduce ? value : animated

  return (
    <span ref={ref} className="tabular">
      <span aria-hidden>{format(display)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  )
}
