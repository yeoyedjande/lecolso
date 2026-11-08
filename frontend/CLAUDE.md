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
  et lève `ValidationError` (messages par champ) sur un 422 et `ConflictError` (`code` métier) sur un 409.
  Seuls les hooks de `features/<domaine>/api.ts` importent `api` ; les composants n'importent jamais `openapi-fetch`
  (ESLint `no-restricted-imports`).
- Formulaires : react-hook-form + zod ; les messages d'erreur 422 du backend sont affichés sur les champs correspondants.
- Aucun texte en dur dans les composants : tout passe par i18n (`t('students.list.title')`), français par défaut.
  ESLint l'impose (`i18next/no-literal-string` en mode `jsx-text-only`, en erreur) sur `src/**/*.tsx`, sauf tests,
  stories et `src/components/ui` (shadcn). Les clés sont typées depuis `src/i18n/fr.json` : une clé inconnue ne compile pas.
- Montants : composant `<MoneyAmount value={15000} />` → « 15 000 FCFA ». Dates : JJ/MM/AAAA. Téléphones : `+225 07 00 00 00 00`.
- L'URL de l'API vient uniquement de `import.meta.env.VITE_API_URL` : `/api/v1` en staging et en production (même origine,
  proxy Caddy), URL absolue en local.
- **Routage par chemin (ADR 0005)** : chaque établissement est servi sur `/{slug}/…` (`routes/$school/`), jamais par
  sous-domaine ni par nom d'hôte. Le slug n'est qu'une adresse : la garde retrouve l'école parmi celles de `/me`
  (affectations réelles) ; sans affectation, ou slug inconnu, page introuvable (même réponse) et aucune requête.
- L'en-tête `X-School-Id` (UUID, jamais le slug) est ajouté par le client HTTP à partir de l'école **active de l'onglet**
  (`session.getSchoolId()`), posée par la garde ; ne l'ajoute jamais ailleurs. `session.getLastSchoolId()` (localStorage)
  ne sert qu'à l'accueil `/` et à `/compte`.
- Liens internes vers un écran d'école : `<Link from="/$school" to="/$school/eleves">` (le slug courant est repris) ;
  vers une autre école : `params={{ school: slug }}`. Toute nouvelle route de premier niveau doit être réservée dans
  `backend/config/tenancy.php` (test `features/auth/reservedSegments.test.ts`).
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
  si `prefers-reduced-motion`. **Aucune animation ne retarde le contenu** : pas de fondu entre deux écrans d'un espace
  (`PageTransition` reste réservé à l'écran de connexion), `Reveal` bref (0,16 s, cascade de 20 ms plafonnée).
- Rapidité de navigation : la garde réutilise le profil `/me` en cache (revérifié en arrière-plan après 60 s, attendu
  seulement s'il est absent ou invalidé) ; les liens des menus (`SpaceLink`) préchargent leur écran dès qu'ils sont visibles ;
  aucune latence simulée dans la démo. Mesure : `npm run e2e:perf` (budget 600 ms par écran, processeur ÷ 4, API à 200 ms).
- États : `Skeleton`, `EmptyState`, `ErrorState`, `OfflineBanner`.
- Page `/design` : vitrine des tokens et composants, en local et en staging (`VITE_APP_ENV`) ; en production, `vite.config.ts`
  remplace `DesignPage` par un module vide.
- Espaces d'un établissement : back-office sous `/{slug}/…` (`routes/$school/_gestion/`, accueil `/{slug}/tableau-de-bord`,
  mode sombre possible), `/{slug}/enseignant` et `/{slug}/parent` (mobile, 360 px, toujours en clair) ; page publique `/{slug}`
  et `/{slug}/preinscription` (sans session). Routes globales : `/connexion`, `/mot-de-passe`, `/etablissements`, `/compte`,
  `/plateforme`, `/etat`, `/design`.
  Règles d'accès pures et testées dans `features/auth/access.ts` (`decideAccess`), appliquées par `guard()` dans le `beforeLoad`
  de chaque espace (avec le slug de l'URL) : session, mot de passe provisoire, appartenance à l'école, espace. Menus dans `features/shell/nav.ts`, filtrés par
  les permissions de `/me`. Un écran pas encore livré tombe sur la route attrape-tout `$.tsx` de l'espace (« Bientôt disponible »).

## Données de l'API

- Capacités de l'environnement : `sms_available` (`/me`, page publique) et `mobile_money.available` (politique
  financière, fiche enfant). Faux en production tant qu'aucun fournisseur n'est raccordé : aucun texte ne promet alors
  de SMS (clés `…Sms` utilisées seulement s'il est vrai), les relances ne sont pas proposées, le paiement en ligne
  affiche « bientôt disponible ». Mock e2e : `mockApi(page, { sms: false })` pour ce cas.

- Tout écran passe par les hooks de `features/<domaine>/api.ts` (TanStack Query, clé `['school', <id>, …]`, client
  `lib/api/client.ts`). Il n'y a plus de données de démonstration côté navigateur (lot 11c) : en local et en staging,
  elles viennent du `DemoSeeder` du backend.
- Branchés sur la vraie API : authentification, `/me`, établissements, **cycles et leurs paramètres**
  (`features/cycles/api.ts`), **rôles et permissions** (`features/roles`, écran `/{slug}/roles`) et **comptes de l'école**
  (`features/users`, écran `/{slug}/utilisateurs` : liste par curseur, ajout, rôles, désactivation, suppression,
  mot de passe provisoire), **années scolaires** (`features/academic`, onglet des paramètres) et **classes**
  (`features/classes` : `useClassroomList`, `useSaveClassroom`, `useDeleteClassroom`), **élèves, tuteurs et
  inscriptions** (`features/students/api.ts` : `useStudentList` par curseur, `useStudentFile` — `null` si introuvable
  ou hors périmètre —, `useEnrollStudent`, `useUpdateStudent`, `useUpdateEnrollment`, tuteurs ; écrans Élèves, fiche,
  Inscriptions). `medical` vaut `null` sans `students.medical.view` : n'afficher et n'envoyer les champs médicaux
  que s'il est renseigné (fiche) ou si l'utilisateur a la permission sur le cycle de la classe (assistant).
  Photos (élève et parents, facultatives) : `photo_url` signée de 10 minutes, affichée par `<Avatar photoUrl>`
  (initiales si absente ou illisible), envoyée par `<PhotoControl>` (`useStudentPhoto`, JPEG/PNG/WebP, 5 Mo au plus).
  **Facturation** (`features/billing/api.ts`) : grille de frais et calendriers (`useBillingGrid`, `useSaveFeeGrid`,
  `useSaveCalendar`, `useGenerateInvoices`), échéancier (`useBillingSchedules`), factures d'un élève
  (`useStudentInvoices`, `useChangeInvoice` : service, ligne manuelle, remise) dans l'onglet « Frais » de la fiche,
  services optionnels choisis à l'inscription. **Encaissements** (`useRecordPayment` : facture de l'année de l'élève
  trouvé par `useStudentList`), **reçus** (`useReceipt`, `<ReceiptSheet>` ; annulation par la direction,
  `useCancelPayment` ; **reçu PDF** : `<ReceiptPdfButton>`, `useReceiptPdf` relu toutes les 2 s pendant le rendu puis
  toutes les 8 min pour garder l'URL signée valide, `useRetryReceiptPdf`, au guichet et dans l'espace parent),
  **caisse du jour** (`useCashDesk`, `useCloseCashSession`), situation, paiements, remboursement et
  report d'un trop-perçu dans l'onglet « Frais » (`useChangeInvoice` : `refund`, `transfer`), politique de départ dans
  l'écran Frais (`useFinancialPolicy`), **impayés et relances SMS** (`useUnpaid`, `useRemind`), **tableau de bord**
  (`features/dashboard` : `useDashboard`, effectifs, finances et présences). **Présences** (`features/attendance/api.ts` :
  `useAttendanceClassrooms`, `useRollCall`, `useSaveRollCall`, `useAttendanceHistory`, `useAbsences`,
  `useJustifyAbsence`, `useDecideJustification`, `useDaycareBoard`, `useDaycareRecord`) : écrans Présences et Garderie.
  Saisies hors connexion (`networkMode: 'always'`) : `lib/offline/outbox.ts` (`enqueue`), envoi par
  `features/sync` (`flushOutbox`, `<OutboxSync>` dans le back-office et dans `MobileLayout`), compteur dans
  `<OfflineBanner>`.
  **Espace enseignant** (`features/teacher/api.ts` : `useTeacherClasses` — classes dont il est titulaire, d'après
  `attendance/classrooms` et `grading/classrooms`) : accueil (appel du jour par classe), appel (`RollCallPanel`),
  garderie (`DaycarePage`), notes et compétences mobiles (`TeacherGrades`), appréciations (`AppreciationDialog` du
  back-office), élèves et fiche en lecture seule (`useStudentList`, `useStudentFile`), messages aux parents de ses
  élèves (tuteur choisi dans la fiche).
  **Messagerie** (`features/messaging/api.ts` : `useConversations`, `useConversation` — `null` si introuvable —,
  `useStartConversation`, `useReply`, `useMarkRead`, `useUnreadCount`, relus toutes les 90 s) : écran Messages du
  back-office, de l'enseignant et du parent ; fil partagé `ConversationThread` (marqué lu à l'ouverture, lecture seule
  si `can_write` est faux), liste mobile `MobileConversations`, pastille `UnreadBadge` sur le menu « Messages ».
  **Absences annoncées** : le parent prévient d'une absence à venir (`/{slug}/parent/prevenir`, `usePlanAbsence`),
  la fiche de l'enfant les liste (onglet Absences) ; l'appel affiche « Absence annoncée » (`planned` de la ligne) ;
  la direction décide dans Présences › Absents du jour (`usePlannedAbsences`, `useDecidePlannedAbsence`).
  **Annonces** (`useAnnouncements`, `useAnnouncementTargets` — publics permis —, `usePublishAnnouncement`,
  `useDeleteAnnouncement`) : `AnnouncementForm` et `AnnouncementList` (`features/messaging/components/Announcements.tsx`)
  dans l'onglet Annonces du back-office, les messages de l'enseignant (« Annonce à la classe ») et les accueils
  parent et enseignant ; SMS affiché mais désactivé jusqu'au lot 10.
  **Calendrier** (`features/calendar/api.ts` : `useEvents(from, to)`, `useSaveEvent`, `useDeleteEvent`) : écran
  Calendrier (ajout, modification et suppression si `can_manage`), `UpcomingEvents` sur les accueils mobiles.
  **Notes et compétences** (`features/grades/api.ts` : `useGradingClassrooms`, `useGradeGrid`, `useCreateAssessment`,
  `useUpdateAssessment`, `useDeleteAssessment`, `useSaveGrades`, `useClassResults`, `useSkillGrid`, `useSaveSkills`,
  réglages `useGradingSettings`, `useSaveTerms`, `useSaveSubjects`, `useSaveSkillCatalog`) : écrans Notes
  (`GradeGridEditor` : « abs » pour une absence, moyenne ramenée sur l'échelle du cycle), Compétences et onglet « Notes »
  des Paramètres (`GradingSettingsPanel`). Évaluations, notes et compétences se saisissent hors connexion (file locale,
  grille mise à jour aussitôt). **Bulletins** (`useReportCards` — relu toutes les 5 s tant qu'un PDF est en cours —,
  `useSaveAppreciation`, `useCloseTerm`, `useReopenTerm`, `useRetryReportCards`, seuils `useSaveMentionThresholds`) :
  écran Bulletins (appréciations, mention, validation et déverrouillage motivé, PDF par `pdf_url` signée) ; une période
  validée met les grilles Notes et Compétences en lecture seule (`closed`).
  **Espace parent** (`features/parent/api.ts` : `useMyChildren` — `/guardian/children` —, `useChild(studentId, termId)`
  — `null` si ce n'est pas son enfant —, `useJustifyAbsence` — multipart, en attente de l'école) : accueil (présence du
  jour, reste à payer, absences à justifier), fiche (`ChildPage`, onglet ouvrable par `?onglet=notes|absences|bulletins|frais`) :
  notes au fil de l'eau (moyenne par matière seulement ; moyenne générale, rang et mention sur le bulletin validé),
  compétences, absences, bulletins validés (PDF signé), frais et reçus (`ParentReceipt` : `useReceipt` et
  `receiptContent` de `features/billing/receipt.ts`). **Paiement Mobile Money** (lot 10a : `usePayForChild`,
  `usePaymentIntent` — relu toutes les 3 s tant qu'il est en attente —, `mobileMoneyCharge` : même calcul de frais que
  l'API) : `MobileMoneyDialog` (montant proposé ou libre plafonné au reste dû, opérateur et numéro, attente de
  validation, reçu ou nouvel essai) depuis Paiements et l'onglet Frais ; « bientôt disponible » si
  `mobile_money.available` est faux (aucun prestataire configuré). Réglage des frais par la direction dans l'écran Frais
  (`useSaveFinancialPolicy({ mobile_money })`).
  Import Excel (`ImportPage`, `features/students/import.ts`) : fichier lu dans le navigateur (`read-excel-file`, chargé
  à la demande), lignes normalisées puis vérifiées par l'API (`useCheckImport`, `dry_run`) ; inscription des lignes
  prêtes par lots de 50 (`useImportStudents`, progression affichée). Erreurs par ligne : codes de l'API
  (`IMPORT_ERRORS`, libellés `import.errors.*`).
  Rôles attribuables : `features/users/grants.ts` (mêmes règles que `UserPolicy`).
  `can(membership, ['a', 'b'])` : l'une des permissions suffit (menus, `RequirePermission`).
  **Identité de l'école** (`features/school` : `useSchoolProfile`, formulaire et logo dans Paramètres) ; logo dans
  l'en-tête (`ContextSwitcher`) et sur la page publique via `<SchoolLogo>`. `logo_url` est une URL signée de 30 minutes :
  la requête est relue après 10 minutes, l'URL n'est jamais stockée. Téléphone d'un établissement : `normalizeCiAnyPhone`
  (fixes acceptés) ; comptes et Mobile Money : `normalizeCiPhone` (mobiles seulement).
- Rôles : clé système (`director`…) ou identifiant d'un rôle personnalisé de l'école (ADR 0006). Libellé par
  `useRoleLabel()` (`features/auth/roles.ts` : traduction `roles.<clé>`, ou `role_name` de `/me`), jamais une traduction
  directe de la clé (un rôle personnalisé n'a pas de traduction). Un rôle personnalisé ouvre le back-office. Libellés des permissions : `permissions.<clé>` ; modules :
  `permissionGroups.<module>`. Éditeur : on ne coche que ce que l'on détient sur toute l'école (`canGrant`, même règle que l'API).
- Le comportement des écrans pédagogiques vient des paramètres du cycle (`usePedagogyClasses`) : notes pour
  `assessment_mode = weighted_average`, compétences pour `competency`, appel pour `attendance_mode = roll_call`,
  garderie pour `check_in_out`, bulletin ou livret selon `report_document`.
- Espaces parent et enseignant : rattachement par le téléphone du compte (`features/parent`, `features/teacher`) ; un parent
  ne lit que ses enfants, un enseignant que ses classes (règle appliquée par l'API, parcours dans `e2e/mobile.spec.ts`).
- Plateforme (`/plateforme`, super-admin, `features/platform`) et page publique (`/{slug}`, `features/public`) :
  vraie API (`/platform/schools`, `/public/schools/{slug}` : résolution publique par slug, sans `/me` ni affectation).
  Tarifs (`usePublicFees` : `/public/schools/{slug}/fees`, section masquée si l'école ne les publie pas ; réglage
  `<PublicPageSettings>` dans Paramètres) et pré-inscription (`usePreRegister`, champ piège `website`, 429 géré) en
  vraie API. Secrétariat : écran `/{slug}/pre-inscriptions` (`PreRegistrationsPage`, `usePreRegistrations`,
  `useRefusePreRegistration`) ; « Inscrire » ouvre `/{slug}/inscriptions?preinscription=<id>`, où `EnrollmentWizard`
  reprend l'enfant et le parent et envoie `pre_registration_id`.
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
  côté JavaScript ; `localStorage` ne garde que la dernière école utilisée. Hooks : `features/auth/api.ts`.

## Accessibilité et UX

- Composants shadcn/ui (Radix) : focus visible, labels sur tous les champs, contrastes AA.
- Utilisateurs peu à l'aise avec le numérique : libellés simples, icône + texte sur les actions principales, confirmations claires.

## Tests

- Vitest + Testing Library pour composants et hooks (`*.test.tsx` à côté du fichier). MSW pour simuler l'API.
- Playwright (`e2e/`) pour les parcours critiques : connexion, inscription d'un élève, encaissement, saisie de notes, appel hors connexion.
  API simulée par `e2e/mock-api.ts` (contrat OpenAPI, comptes du seeder de démo, 404 pour un `X-School-Id` sans affectation),
  en 360 et 1280 px. Cloisonnement entre écoles par l'URL : `e2e/tenancy.spec.ts`.
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
npm run e2e:perf     # temps clic de menu → contenu affiché, conditions ralenties (hors CI)
npm run size         # budget JS initial < 300 Ko gzip (après npm run build)
npm run api:types    # openapi-typescript ../docs/api/openapi.json -o src/lib/api/schema.d.ts
```
