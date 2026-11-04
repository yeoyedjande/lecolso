import { cn } from '@/lib/utils'

/*
 * Motifs et illustrations géométriques originaux (aucune image sous licence, aucune personne représentée).
 * Purement décoratifs : aria-hidden.
 */

/**
 * Grand motif de fond (panneau de marque) : soleil et formes dans les coins, arcs en bas, pointillés discrets.
 * La zone centrale gauche reste libre pour le texte.
 */
export function HeroPattern({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 720"
      className={cn('h-full w-full', className)}
      aria-hidden
      focusable="false"
      preserveAspectRatio="xMaxYMid slice"
    >
      <defs>
        <pattern id="hero-dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.6" fill="#FBF8F3" opacity="0.14" />
        </pattern>
      </defs>
      <rect width="520" height="720" fill="#1B2559" />
      <rect width="520" height="720" fill="url(#hero-dots)" />
      <circle cx="500" cy="40" r="120" fill="#F28C28" />
      <circle
        cx="500"
        cy="40"
        r="150"
        fill="none"
        stroke="#FBF8F3"
        strokeWidth="2"
        opacity="0.25"
      />
      <rect
        x="330"
        y="150"
        width="54"
        height="54"
        rx="16"
        fill="#3B82F6"
        transform="rotate(-12 357 177)"
      />
      <circle cx="357" cy="177" r="10" fill="#FBF8F3" opacity="0.9" />
      <circle cx="470" cy="250" r="8" fill="#16A34A" />
      <path
        d="M-60 760c80-120 240-120 320 0"
        fill="none"
        stroke="#F5B700"
        strokeWidth="24"
        strokeLinecap="round"
      />
      <path
        d="M240 790c50-90 180-90 230 0"
        fill="none"
        stroke="#F97362"
        strokeWidth="24"
        strokeLinecap="round"
      />
      <circle cx="488" cy="640" r="7" fill="#FBF8F3" opacity="0.5" />
    </svg>
  )
}

/** Bandeau (en-têtes mobiles, cartes d'accueil) : soleil dans le coin supérieur droit. */
export function RibbonPattern({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 360 160"
      className={cn('h-16 w-full', className)}
      aria-hidden
      focusable="false"
      preserveAspectRatio="xMaxYMin slice"
    >
      <circle cx="350" cy="-6" r="56" fill="#F28C28" opacity="0.95" />
      <circle
        cx="350"
        cy="-6"
        r="76"
        fill="none"
        stroke="#FBF8F3"
        strokeWidth="1.5"
        opacity="0.25"
      />
      <rect
        x="276"
        y="52"
        width="16"
        height="16"
        rx="5"
        fill="#3B82F6"
        transform="rotate(-12 284 60)"
      />
    </svg>
  )
}

type IllustrationName = 'empty' | 'search' | 'error' | 'offline' | 'lost' | 'soon'

/** Illustrations des états vide, erreur, hors connexion, page introuvable, bientôt disponible. */
export function StateIllustration({
  name,
  className,
}: {
  name: IllustrationName
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 160 120"
      className={cn('h-28 w-auto', className)}
      aria-hidden
      focusable="false"
    >
      <ellipse cx="80" cy="106" rx="56" ry="8" fill="#E7E1D6" />
      {name === 'empty' && (
        <>
          <rect
            x="34"
            y="34"
            width="92"
            height="64"
            rx="16"
            fill="#FFFFFF"
            stroke="#D5CCBE"
            strokeWidth="2"
          />
          <path d="M34 58h30l8 12h16l8-12h30" fill="none" stroke="#D5CCBE" strokeWidth="2" />
          <circle cx="118" cy="30" r="14" fill="#F28C28" />
          <rect x="28" y="20" width="16" height="16" rx="5" fill="#F5B700" />
        </>
      )}
      {name === 'search' && (
        <>
          <circle cx="72" cy="56" r="30" fill="#FFFFFF" stroke="#1B2559" strokeWidth="6" />
          <path d="m94 78 22 22" stroke="#1B2559" strokeWidth="9" strokeLinecap="round" />
          <circle cx="72" cy="56" r="10" fill="#F97362" />
          <circle cx="122" cy="34" r="8" fill="#3B82F6" />
        </>
      )}
      {name === 'error' && (
        <>
          <path
            d="M80 16 136 98H24Z"
            fill="#FBE1DF"
            stroke="#DC2626"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path d="M80 46v24" stroke="#B91C1C" strokeWidth="7" strokeLinecap="round" />
          <circle cx="80" cy="84" r="4.5" fill="#B91C1C" />
        </>
      )}
      {name === 'offline' && (
        <>
          <path
            d="M36 58a62 62 0 0 1 88 0M50 72a42 42 0 0 1 60 0M64 86a22 22 0 0 1 32 0"
            fill="none"
            stroke="#A89F91"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <circle cx="80" cy="98" r="6" fill="#1B2559" />
          <path d="m40 26 80 80" stroke="#F28C28" strokeWidth="7" strokeLinecap="round" />
        </>
      )}
      {name === 'lost' && (
        <>
          <path
            d="M40 98V54l40-30 40 30v44Z"
            fill="#FFFFFF"
            stroke="#1B2559"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <rect x="68" y="70" width="24" height="28" rx="6" fill="#F28C28" />
          <circle cx="126" cy="28" r="12" fill="#F5B700" />
          <path
            d="M120 44c10 6 14 14 12 24"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="4"
            strokeDasharray="2 7"
            strokeLinecap="round"
          />
        </>
      )}
      {name === 'soon' && (
        <>
          <rect x="30" y="40" width="34" height="58" rx="10" fill="#F97362" />
          <rect x="63" y="22" width="34" height="76" rx="10" fill="#F5B700" />
          <rect x="96" y="54" width="34" height="44" rx="10" fill="#3B82F6" />
          <circle cx="80" cy="14" r="8" fill="#F28C28" />
        </>
      )}
    </svg>
  )
}
