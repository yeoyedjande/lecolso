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
- Formulaires : react-hook-form + zod ; les messages d'erreur 422 du backend sont affichés sur les champs correspondants.
- Aucun texte en dur dans les composants : tout passe par i18n (`t('students.list.title')`), français par défaut.
- Montants : composant `<MoneyAmount value={15000} />` → « 15 000 FCFA ». Dates : JJ/MM/AAAA. Téléphones : `+225 07 00 00 00 00`.
- L'URL de l'API vient uniquement de `import.meta.env.VITE_API_URL` (fixée au build sur Railway).
- L'en-tête `X-School-Id` est ajouté par le client HTTP à partir de l'établissement sélectionné ; ne l'ajoute jamais ailleurs.
  Sur `<slug>.<domaine>`, l'établissement est présélectionné à partir du slug ; sur `app.<domaine>`, l'utilisateur le choisit.
- Fichiers (photos, PDF) : toujours via les URL signées renvoyées par l'API, jamais d'URL de bucket construite côté client.
- Les écrans s'adaptent aux droits : masquer ce que l'utilisateur ne peut pas faire (permissions renvoyées par `/me`), le backend restant la vraie barrière.
- Les écrans s'adaptent au cycle : le mode d'évaluation, de présence et de facturation vient des `settings` du cycle, jamais d'un test sur son nom.

## Mobile et hors connexion

- Parcours parent : 3 écrans maximum pour toute action (voir notes, payer, justifier une absence). Cibles tactiles ≥ 44 px.
- Budget : JS initial < 300 Ko gzip ; routes chargées à la demande ; images en WebP.
- Hors connexion (appel, saisie de notes, journal garderie) : écriture dans Dexie avec un UUID généré côté client,
  file de synchronisation vers `POST /api/v1/sync`, indicateur visible « X éléments en attente ».
- Service worker : vite-plugin-pwa en `injectManifest`, cache réseau d'abord pour l'API, cache d'abord pour les assets.

## Accessibilité et UX

- Composants shadcn/ui (Radix) : focus visible, labels sur tous les champs, contrastes AA.
- Utilisateurs peu à l'aise avec le numérique : libellés simples, icône + texte sur les actions principales, confirmations claires.

## Tests

- Vitest + Testing Library pour composants et hooks (`*.test.tsx` à côté du fichier). MSW pour simuler l'API.
- Playwright (`e2e/`) pour les parcours critiques : connexion, inscription d'un élève, encaissement, saisie de notes, appel hors connexion.

## Commandes

```bash
npm run dev          # serveur Vite
npm run test         # Vitest
npm run lint         # ESLint + Prettier
npm run typecheck    # tsc --noEmit
npm run e2e          # Playwright
npm run api:types    # openapi-typescript ../docs/api/openapi.json -o src/lib/api/schema.d.ts
```
