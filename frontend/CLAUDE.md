# Frontend — back-office web et PWA

Règles propres au frontend. Les règles du fichier `CLAUDE.md` racine s'appliquent aussi.

Une seule application React sert trois publics : le personnel (back-office, desktop d'abord), les enseignants et les parents
(PWA, mobile d'abord, Android d'entrée de gamme, connexion 3G instable).

## Organisation

```text
src/
├── app/            # bootstrap, providers (QueryClient, Router, i18n), layout racine
├── routes/         # routes TanStack Router (fichiers), une par écran
├── features/       # un dossier par domaine métier, miroir du backend
│   ├── students/   { api.ts, components/, hooks/, schemas.ts }
│   ├── billing/
│   └── …
├── components/ui/  # composants shadcn/ui (générés, modifiables)
├── components/     # composants partagés métier (MoneyAmount, PhoneInput, CyclePicker…)
├── lib/
│   ├── api/        # client HTTP + schema.d.ts généré (NE PAS ÉDITER à la main)
│   ├── offline/    # Dexie, file de synchronisation
│   └── format.ts   # dates, montants, téléphones
└── i18n/fr.json    # tous les textes visibles
```

## Règles

- TypeScript `strict`, pas de `any`, pas de `as` sauf justification en commentaire.
- Types d'API uniquement depuis `lib/api/schema.d.ts` (généré par `make types`). Ne redéfinis jamais à la main un type renvoyé par l'API.
- Données serveur : TanStack Query uniquement (`useQuery` / `useMutation` dans `features/<domaine>/api.ts`), pas d'état global pour elles.
- Client HTTP : une seule instance `openapi-fetch` dans `lib/api/client.ts` (cookie de session, voir « Authentification »).
  Son middleware ajoute `X-School-Id` et le jeton CSRF, efface les données locales sur un 401 (`UnauthorizedError`)
  et lève `ValidationError` (messages par champ) sur un 422.
  Seuls les hooks de `features/<domaine>/api.ts` importent `api` ; les composants n'importent jamais `openapi-fetch`
  (ESLint `no-restricted-imports`).
- Formulaires : react-hook-form + zod ; les messages d'erreur 422 du backend sont affichés sur les champs correspondants.
- Aucun texte en dur dans les composants : tout passe par i18n (`t('students.list.title')`), français par défaut.
  ESLint l'impose (`i18next/no-literal-string` en mode `jsx-text-only`, en erreur) sur `src/**/*.tsx`, sauf tests,
  stories et `src/components/ui` (shadcn). Les clés sont typées depuis `src/i18n/fr.json` : une clé inconnue ne compile pas.
- Montants : composant `<MoneyAmount value={15000} />` → « 15 000 FCFA ». Dates : JJ/MM/AAAA. Téléphones : `+225 07 00 00 00 00`.
- L'URL de l'API vient uniquement de `import.meta.env.VITE_API_URL` (fixée au build sur Railway).
- L'en-tête `X-School-Id` est ajouté par le client HTTP à partir de l'établissement sélectionné ; ne l'ajoute jamais ailleurs.
  Sur `<slug>.<domaine>`, l'établissement est présélectionné à partir du slug ; sur `app.<domaine>`, l'utilisateur le choisit.
- Fichiers (photos, PDF) : toujours via les URL signées renvoyées par l'API, jamais d'URL de bucket construite côté client.
- Les écrans s'adaptent aux droits : masquer ce que l'utilisateur ne peut pas faire (permissions renvoyées par `/me`), le backend restant la vraie barrière.
- Les écrans s'adaptent au cycle : le mode d'évaluation, de présence et de facturation vient des `settings` du cycle, jamais d'un test sur son nom.

## Design system et espaces

- Tokens dans `src/index.css` (`:root`, `.dark`), exposés à Tailwind par `@theme inline`. Couleurs de base pour fonds,
  bordures et graphiques ; **texte coloré uniquement avec les variantes `-ink`** (`text-accent-ink`, `text-cycle-primary-ink`,
  `text-success-ink`…). `src/styles/contrast.test.ts` vérifie le contraste AA de chaque paire texte / fond.
- Couleur d'un cycle : `lib/cycles.ts` (`cycleTone`, `CYCLE_CLASSES`, `CYCLE_HEX`) et `<CycleBadge>`, jamais une couleur en dur.
- Polices auto-hébergées (`@fontsource-variable`, `src/styles/fonts.css`) : `font-display` (Bricolage Grotesque) pour titres
  et chiffres clés, Inter pour le texte.
- Mouvement : `motion` via `components/motion` (`Reveal`, `PageTransition`, `AnimatedNumber`) ; `MotionProvider` coupe tout
  si `prefers-reduced-motion`.
- États : `Skeleton`, `EmptyState`, `ErrorState`, `OfflineBanner`, `DemoBanner` (écrans alimentés par `features/<domaine>/demo/`
  quand `VITE_DEMO_MODULES=true`).
- Page `/design` : vitrine des tokens et composants, en local et en staging (`VITE_APP_ENV`) ; en production, `vite.config.ts`
  remplace `DesignPage` par un module vide.
- Espaces : `/gestion` (back-office, mode sombre possible), `/enseignant` et `/parent` (mobile, 360 px, toujours en clair).
  Règles d'accès pures et testées dans `features/auth/access.ts` (`decideAccess`), appliquées par `guard()` dans le `beforeLoad`
  de chaque route : session, mot de passe provisoire, établissement, espace. Menus dans `features/shell/nav.ts`, filtrés par
  les permissions de `/me`. Un écran pas encore livré tombe sur la route attrape-tout `$.tsx` de l'espace (« Bientôt disponible »).

## Données de démonstration (modules sans backend)

- Générateur déterministe dans `lib/demo/` (`dataset.ts` : élèves, tuteurs, frais, échéances, paiements, notes,
  compétences, présences, garderie, messages, calendrier ; année 2026-2027) et magasin en mémoire par établissement
  (`store.ts`, perdu au rechargement). Calculs métier purs et testés dans `features/<domaine>/demo/`
  (soldes, impayés, moyennes pondérées, rangs, appel…).
- Les écrans n'appellent que les hooks de `features/<domaine>/api.ts`, construits sur `useDemoQuery` / `useDemoMutation`
  (`lib/demo/hooks.ts`, clé `['school', <id>, …]`). Quand un module backend existera, seul le `queryFn` du hook change.
  `VITE_DEMO_MODULES=false` : ces hooks lèvent `ModuleUnavailableError` et `<QueryState>` affiche « Bientôt disponible ».
- Restent branchés sur la vraie API : authentification, `/me`, établissements, **cycles et leurs paramètres**
  (`features/cycles/api.ts`) et la réinitialisation de mot de passe d'un utilisateur réel.
- Le comportement des écrans pédagogiques vient des paramètres du cycle (`usePedagogyClasses`) : notes pour
  `assessment_mode = weighted_average`, compétences pour `competency`, appel pour `attendance_mode = roll_call`,
  garderie pour `check_in_out`, bulletin ou livret selon `report_document`.
- Graphiques : Recharts, couleurs de `components/charts/chartTheme.ts` et `CYCLE_CHART` (palette validée), toujours avec
  un tableau équivalent pour les lecteurs d'écran.

## Mobile et hors connexion

- Parcours parent : 3 écrans maximum pour toute action (voir notes, payer, justifier une absence). Cibles tactiles ≥ 44 px.
- Budget : JS initial < 300 Ko gzip ; routes chargées à la demande ; images en WebP.
- Hors connexion (appel, saisie de notes, journal garderie) : écriture dans Dexie avec un UUID généré côté client,
  file de synchronisation vers `POST /api/v1/sync`, indicateur visible « X éléments en attente ».
- Service worker : vite-plugin-pwa en `injectManifest`, cache d'abord pour les fichiers de l'application (même origine).
  **Aucune réponse de l'API n'est mise en cache** (données personnelles) ni aucun fichier d'une autre origine (photos
  par URL signée) : le hors connexion passe uniquement par Dexie. `clearLocalData()` (`lib/offline/wipe.ts`) vide Dexie
  (qui reste réutilisable), Cache Storage sauf le precache de l'application (HTML/JS/CSS, nécessaire hors connexion)
  et les clés `localStorage` de l'application, à la déconnexion et sur tout 401.
- Authentification : cookie de session httpOnly (Sanctum, mode SPA), `credentials: 'include'`, en-tête `X-XSRF-TOKEN`
  (cookie `XSRF-TOKEN` récupéré par `/sanctum/csrf-cookie` si absent, nouvel essai unique après un 419). Aucun jeton
  côté JavaScript ; `localStorage` ne garde que l'établissement sélectionné. Hooks : `features/auth/api.ts`.

## Accessibilité et UX

- Composants shadcn/ui (Radix) : focus visible, labels sur tous les champs, contrastes AA.
- Utilisateurs peu à l'aise avec le numérique : libellés simples, icône + texte sur les actions principales, confirmations claires.

## Tests

- Vitest + Testing Library pour composants et hooks (`*.test.tsx` à côté du fichier). MSW pour simuler l'API.
- Playwright (`e2e/`) pour les parcours critiques : connexion, inscription d'un élève, encaissement, saisie de notes, appel hors connexion.
  API simulée par `e2e/mock-api.ts` (contrat OpenAPI, comptes du seeder de démo), en 360 et 1280 px.
- Accessibilité : `e2e/a11y.spec.ts` passe axe (WCAG 2.1 A/AA) sur chaque écran de `e2e/screens.ts`, en clair et en sombre
  pour le back-office. Tout nouvel écran y est ajouté.
- Captures : `npm run e2e:captures` → `captures/360/` et `captures/1280/` (non versionnées), à joindre à chaque pull request.

## Commandes

```bash
npm run dev          # serveur Vite
npm run test         # Vitest
npm run lint         # ESLint + Prettier
npm run typecheck    # tsc --noEmit
npm run e2e          # Playwright (parcours + axe)
npm run e2e:captures # captures d'écran 360 et 1280 px
npm run size         # budget JS initial < 300 Ko gzip (après npm run build)
npm run api:types    # openapi-typescript ../docs/api/openapi.json -o src/lib/api/schema.d.ts
```
