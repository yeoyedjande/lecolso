# Backend — API Laravel

Règles propres au backend. Les règles du fichier `CLAUDE.md` racine s'appliquent aussi.

## Organisation : monolithe modulaire par domaine

```text
app/
├── Domains/
│   ├── Tenancy/      # School, Organization, Subscription, résolution du tenant, RLS
│   ├── Identity/     # User, RoleAssignment, OTP, 2FA
│   ├── Academic/     # AcademicYear, Term, Cycle, Level, Classroom
│   ├── Students/     # Student, Guardian, Enrollment, Document, pré-inscription
│   ├── Billing/      # FeeType, FeeSchedule, Invoice, Payment, CashSession, PaymentGateway
│   ├── Grading/      # Subject, Assessment, Grade, Skill, ReportCard, GradingStrategy
│   ├── Attendance/   # Attendance, Pickup, DailyLog
│   └── Messaging/    # Announcement, Message, Notifier, canaux
│       └── <Domaine>/
│           ├── Models/
│           ├── Actions/        # un cas d'usage = une classe, méthode handle()
│           ├── Data/           # objets d'entrée/sortie typés (readonly)
│           ├── Http/Controllers/  Http/Requests/  Http/Resources/
│           ├── Policies/
│           ├── Events/  Listeners/  Jobs/
│           ├── Enums/
│           └── routes.php      # routes du domaine, chargées automatiquement sous /api/v1
└── Support/          # code transverse : Rls, Money, Phone, BelongsToSchool, CycleSettings
    └── Routing/DomainRoutes.php   # chargement des routes par domaine
```

Un domaine n'accède pas aux modèles d'un autre domaine pour écrire : il appelle une Action de ce domaine ou réagit à un événement.
La lecture via relations Eloquent entre domaines est autorisée.

### Chargement des routes

Laravel 11+ n'a plus de `RouteServiceProvider`. `bootstrap/app.php` appelle `App\Support\Routing\DomainRoutes::register()`
(callback `then` de `withRouting`), qui charge chaque `app/Domains/<Domaine>/routes.php` (ordre alphabétique) avec le préfixe
`/api/v1` et le groupe de middleware `api`. Il n'y a ni `routes/web.php` ni `routes/api.php` : une nouvelle route se déclare
dans le `routes.php` de son domaine, sans préfixe (`Route::get('health', …)` → `GET /api/v1/health`).

## Conventions de code

- `declare(strict_types=1);` dans chaque fichier. Types de retour et de paramètres partout. Larastan niveau max sans baseline nouvelle.
- Contrôleurs minces : `FormRequest` (validation + `authorize()` via Policy) → Action → `JsonResource`. Pas de logique métier dans un contrôleur.
- Actions : classes `final`, injectées par le conteneur, transaction DB explicite quand plusieurs écritures (`DB::transaction`).
- Énumérations PHP natives (`enum PaymentMethod: string`) castées sur les modèles ; pas de chaînes magiques.
- Événements métier au passé : `PaymentReceived`, `StudentEnrolled`, `StudentMarkedAbsent`. Les notifications sont des listeners en file.
- Tout appel à un service externe (paiement, SMS, WhatsApp, Gotenberg) passe par une interface du domaine
  (`PaymentGateway`, `SmsSender`, `WhatsAppSender`, `PdfRenderer`) avec une implémentation `Fake` utilisée en tests et en local.
- Tout ce qui est lent ou dépend d'un tiers part dans un Job (`ShouldQueue`), jamais dans la requête HTTP.
- Les Jobs reçoivent le `school_id` et rétablissent le contexte tenant (middleware de job `SetTenantContext`).

## Multi-tenant : comment ça marche

1. Middleware `ResolveSchool` (alias `school`, après `auth:sanctum`) : lit l'en-tête `X-School-Id` (UUID). L'URL du frontend
   `app.<domaine>/{slug}/*` (ADR 0005) ne sert qu'au frontend, qui retrouve l'UUID dans `/me` : l'API ne lit jamais
   ni le slug ni le nom d'hôte, et un slug n'autorise rien. **400** si l'en-tête est absent ou n'est pas un UUID ;
   **404** si l'école n'existe pas ou si l'utilisateur n'y a aucune affectation (même réponse : rien à deviner).
2. Le contexte passe par `App\Support\Tenancy\TenantContext` : `CurrentSchool` côté PHP (liaison `scoped`) et, côté PostgreSQL,
   `set_config('app.school_id', …)` et `set_config('app.user_id', …)` (paramètres liés), lus par les politiques RLS.
   `TenantContext::run($school, fn)` exécute un bloc dans une école puis rétablit le contexte précédent.
3. Remise à zéro : dans un `finally` et dans `terminate()` du middleware, et avant/après **chaque** job (écouteurs de file dans
   `TenancyServiceProvider`, sauf file `sync` où le job tourne dans la requête et `SetTenantContext` rétablit son contexte). Si la connexion est en erreur, elle est fermée : une session neuve n'a aucun contexte.
4. Le trait `BelongsToSchool` ajoute le scope global (aucune ligne sans école courante), remplit `school_id` à la création
   (exception `MissingTenantContext` sans contexte ou pour une autre école) et interdit de changer `school_id`.
5. RLS en base, en mode fermé, bloque tout ce qui aurait échappé au scope (`App\Support\Database\Rls`).
6. Jobs : implémenter `TenantAware` et utiliser le trait `RunsInSchool` (propriété publique `$schoolId`) ; le middleware de job
   `SetTenantContext` rétablit l'école le temps du job.

Slugs : identifiants d'URL figés à la création (aucune route ne les modifie), hors segments réservés
(`config/tenancy.php`, français et anglais). Tout lien envoyé à un utilisateur passe par
`App\Support\Tenancy\SchoolUrl::to($school, 'chemin')` (`FRONTEND_URL/{slug}/chemin`), jamais par une URL construite à la main.

Routes hors tenant (super-admin, pré-inscription publique, webhooks) : groupe de routes dédié, sans `ResolveSchool`,
qui fixe explicitement le tenant après vérification (ex. le webhook retrouve l'école depuis la transaction).

### Super-admin (`/api/v1/platform/*`)

- Middleware `super_admin` (`EnsureSuperAdmin`, après `auth:sanctum`) : `users.is_super_admin` (jamais assignable en masse), sinon **404**.
- Lecture et écriture hors RLS uniquement par `Platform::run(fn)` : bascule la connexion par défaut sur `pgsql_platform`
  (rôle de connexion séparé `app_platform`, `BYPASSRLS`), dans une transaction, et rétablit la connexion précédente dans un `finally`.
- Seules les Actions des routes `/api/v1/platform/*` importent `Platform` (test d'architecture `tests/Unit/ArchitectureTest.php`).
  Les modèles chargés dans `Platform::run()` gardent la connexion `pgsql_platform` : ne pas les réutiliser pour écrire ensuite.
- Identifiants `DB_PLATFORM_*` fournis au seul service `api` (ni `worker` ni `scheduler`).

## Identité, authentification et droits

- **Connexion** (`POST /auth/login`) : identifiant (téléphone E.164 ou e-mail, normalisé par `Support\Phone\Phone`) + mot de passe,
  pour tous. Session par cookie httpOnly (Sanctum, mode SPA, `statefulApi()`), sessions Redis. Pas de 2FA ni d'OTP en V1.
- **Aucune énumération** : Action `AttemptLogin` = même travail (hachage factice si le compte n'existe pas), même durée minimale
  (`Timebox`, 400 ms), même message ; limiteur `login` (5/min par identifiant ET 20/min par IP) ; `session()->regenerate()`.
  Déconnexion : `logout()`, `invalidate()`, `regenerateToken()`.
- **Mot de passe provisoire** : `users.must_change_password` ; le middleware `EnsurePasswordChanged` (tout le groupe api)
  ne laisse passer que `/me`, `/auth/password`, `/auth/logout`. Réinitialisation par le personnel :
  `POST /users/{user}/password-reset` (`UserPolicy::resetPassword`, dans la limite des cycles de l'acteur).
- **RLS sur `users`** : soi-même (`app.user_id`) et les membres de l'école courante. `RlsUserProvider` (garde `web`,
  pilote `rls`) pose `app.user_id` avant de charger un utilisateur ; la recherche par identifiant passe par la fonction
  SQL `SECURITY DEFINER` `auth_user_id(login)`, qui ne renvoie qu'un identifiant. `ClearTenantContext` remet le contexte
  à zéro en fin de requête.
- **Droits** : `config/permissions.php` (catalogue des permissions et permissions par défaut des rôles système)
  + rôles de l'école (`RoleCatalog::rolesOf`, ADR 0006 : rôles système, ajustés pour ceux de `config/roles.php`, et rôles
  personnalisés de `school_roles`) + `Authorizer::allows($user, $permission, $school, $cycle)`,
  appelé par les Policies (`Gate::policy` dans `IdentityServiceProvider`). Une affectation limitée à un cycle ne couvre pas
  les ressources de toute l'école. `role_assignments.role` : clé système ou UUID d'un rôle personnalisé de l'école.
  Nouvelle permission : une ligne dans `config/permissions.php` et son libellé `permissions.<clé>` dans `frontend/src/i18n/fr.json`.
  Conflit métier : lever `App\Support\Http\BusinessConflict($code, $message)` (409 `{ message, code }`).
  Paramètres de route (`{cycle}`, `{user}`) liés après `ResolveSchool` (priorité des middlewares), donc sous la RLS
  de l'école courante : modèle d'une autre école = 404.
- `RoleAssignment::ofUser($user)` et `SchoolRole::ofSchool($schoolId)` : seules exceptions autorisées au scope
  « école courante » (affectations de l'utilisateur, rôles de ses écoles : lecture garantie par la RLS).
  `ofUser` exclut les écoles où le compte est désactivé (`member_deactivations`) ; `ResolveSchool` aussi (404).
- **Comptes de l'école** (`/users`, `UserPolicy`) : `viewAny`/`view` (users.view ou users.reset_password, par cycle),
  `create`, `manage` (users.manage sur chacune de ses affectations, jamais soi-même ni un super-admin, un promoteur
  seulement par un promoteur), `grantRole` (cycle, Promoteur et Direction par le promoteur, pas d'élévation sauf
  promoteur et permissions des parents), `revokeRole`. Un compte existant d'une autre école est retrouvé par
  `auth_user_id(phone)` et rattaché. Suppression : affectations retirées, puis `forget_user(id)` (SECURITY DEFINER)
  n'efface que les comptes sans aucune école et jamais un super-admin.
- SMS : interface `Messaging\Contracts\SmsSender` ; `FakeSmsSender` hors production (téléphone masqué, contenu jamais
  journalisé), `UnconfiguredSmsSender` (refus) en production tant qu'aucun fournisseur n'est choisi.

## Élèves, tuteurs et inscriptions (domaine Students)

- `students` (suppression logique, matricule unique dans l'école), `guardians` (un par téléphone dans l'école),
  `guardian_student` (modèle `GuardianLink` : parenté, un payeur et un contact principal par élève, index uniques
  partiels), `enrollments` (une par élève et par année ; la classe appartient à l'année : clé composite
  `(classroom_id, academic_year_id, school_id)`). Une classe qui a des inscriptions ne se supprime pas (409).
- Matricule : `schools.code` + compteur `document_sequences` (`Support\Sequences\Sequence::next()`, à appeler
  dans la transaction qui crée le document : incrément atomique, numéro rendu si la transaction échoue). Réutilisable
  pour les reçus (`receipt:2026`).
- Périmètre : `Students\Support\StudentAccess::constrain($query, $user, $school, $permission)` — rôle `teacher` :
  élèves de ses classes (titulaire) de l'année en cours ; rôle `guardian` : élèves dont un tuteur a le téléphone du
  compte ; tout autre rôle : son cycle ou toute l'école. Hors périmètre : 404 (`ShowStudentRequest`,
  `ManageStudentRequest`). Gestion : `students.manage` sur le cycle de la classe la plus récente (`StudentPolicy`).
- Données médicales (`blood_type`, `allergies`, `medical_notes`) : `students.medical.view` dans le même périmètre ;
  `medical: null` dans la réponse sinon, et champs `prohibited` dans les requêtes. Jamais dans la liste.
- Places : `ClassroomSeats::reserve()` (verrou sur la classe, année ouverte, capacité) avant toute inscription active.

## Facturation (domaine Billing)

- `fee_types` (catalogue `config/billing.php`, créés avec l'école par `ProvisionFeeTypes`), `fee_schedules` (montant
  annuel par niveau et par année), `installment_dates` (calendrier par cycle et par année, créé par `BillingCalendar`
  d'après `CycleSettings::billingPeriod`), `payers`, `invoices` (une par inscription), `invoice_lines` (remise négative)
  et `installments` (somme des échéances d'une ligne = son montant). Montants `bigInteger`, FCFA entiers.
- Facture : `CreateInvoice` (appelée par l'inscription, dans la même transaction, et par `GenerateInvoices`) ; prorata
  par `InvoiceSchedule::remainingShares` ; remises réparties depuis la dernière échéance (`rebalanceDiscounts`, 409
  `discount_exceeds`). La grille n'est jamais réappliquée à une facture émise (`ManageInvoiceLines` pour la modifier).
- Solde : `Support\InvoiceBalance::of($invoice, $date)` — réglé = paiements non annulés + reports reçus −
  remboursements − reports envoyés, imputé aux échéances par date (aucune répartition stockée) ; reste, retard,
  trop-perçu (`credit`), prochaine échéance.
- Encaissements (lot 5b) : `payments`, `payment_cancellations`, `refunds`, `credit_transfers` **immuables** (déclencheur
  `forbid_ledger_update` + `REVOKE UPDATE, DELETE` pour `app_user` et `app_platform`) ; auteurs recopiés (id et nom),
  sans clé étrangère vers `users`. `RecordPayment` : facture verrouillée (`FOR UPDATE`), reste dû vérifié, caisse du
  jour (`CashRegister::openFor`, verrouillée), numéro `REC-AAAA-NNNNNN` par `Sequence` (`receipt:AAAA`). Annulation
  (`CancelPayment`, `billing.cancel`), remboursement (`RefundCredit`, `RMB-…`) et report (`TransferCredit`, même payeur)
  par la direction (`billing.refund`), motif obligatoire. `cash_sessions` : une par caissier et par jour (Africa/Abidjan),
  clôture par son caissier (`CloseCashSession` : espèces attendues figées, compté, note si écart), puis figée
  (déclencheur). Événement `PaymentReceived`.
- Départ d'un élève : `Students\Events\StudentLeft` / `StudentReturned` (dans la transaction de `ChangeEnrollment`)
  → `Listeners\ApplyDeparture` : ligne `departure` négative qui annule le net des échéances postérieures au départ,
  retirée au retour. Politique de l'école : `schools.settings.billing_departure` (`FinancialPolicy`, `DeparturePolicy`),
  écrite par `Tenancy\Actions\UpdateSchoolSettings`.
- Impayés et relances (lot 5c) : `Support\InvoiceTotals` (montants de nombreuses factures en une requête,
  sous-requêtes), `ListUnpaid` (`GET billing/unpaid`), `SendPaymentReminders` (`POST billing/reminders` : un SMS par
  payeur, `MIN_DAYS_BETWEEN` = 7, table `payment_reminders` sans le texte) puis job `Jobs\SendPaymentReminderSms`
  (`TenantAware`, `SmsSender`, texte composé à l'envoi, échec noté sans nouvel essai). `BuildDashboard`
  (`GET billing/dashboard`) : effectifs (`students.view`) et finances (`billing.view`) de l'année en cours par cycle.
- Droits : `billing.view` (périmètre `StudentAccess` pour une facture), `billing.manage` (modifier, encaisser, relancer),
  `billing.discount`, `billing.cancel`, `billing.refund` sur le cycle de la classe (`InvoicePolicy`, `BillingScope`) ;
  caisse : la sienne, toutes avec `billing.manage` sur toute l'école. Payeur suivi par l'événement
  `Students\Events\StudentPayerChanged`.

## Présences (domaine Attendance)

- `roll_calls` (un appel par classe et par jour), `attendance_marks` (absents et retards seulement),
  `attendance_corrections` (direction, motif), `absence_justifications` (motif, photo privée `absence-proofs/`,
  source guardian ou school, statut pending/accepted/refused), `daycare_visits`, `daycare_logs` (note non journalisée),
  `sync_operations` (idempotence de `POST /sync`). Identifiants UUID, éventuellement fournis par l'appareil.
- Droits : `Support\AttendanceAccess` — faire l'appel : titulaire (`attendance.manage`) ou personnel du cycle
  (`Identity\Authorization\StaffScope`, hors rôles Parent et Enseignant) ; voir : `attendance.view` ou titulaire ;
  corriger une journée passée : `attendance.correct` ; décider d'une justification : personnel avec `attendance.manage`.
  Classe non visible : 404.
- `SaveRollCall` : mode du cycle `roll_call` (sinon 409 `wrong_mode`), année ouverte, jour ≤ aujourd'hui ;
  `RollCallWindow::isClosed` (jour passé, sauf saisie hors connexion de moins de 72 h) → direction et motif ;
  élèves inscrits ce jour-là (`ClassRoster::on`). Nouvelles absences : événement `Events\StudentMarkedAbsent`.
- `ApplySyncOperations` (`POST /sync`) : `attendance.roll_call`, `daycare.check`, `daycare.log`, mêmes Actions et
  droits qu'en ligne ; une opération déjà traitée renvoie son premier résultat (`replayed`).
- Jour de l'école : `Support\Time\SchoolClock::date()` (Africa/Abidjan).

## Notes et compétences (domaine Grading)

- `terms` (périodes d'un cycle pour une année, nombre d'après `term_type` : `Support\DefaultTerms`), `subjects` (matières et
  coefficients 1 à 20 par niveau et par année), `assessments` (évaluation d'une classe : matière, période, date dans la
  période, barème `out_of` de 1 à 100), `grades` (`value` décimal à 2 chiffres au barème, ou `absent` ; pas de ligne :
  non saisie), `skills` (référentiel par cycle et par année, rangé par domaine), `skill_evaluations` (A, EA, NA par
  période). Périodes, matières et compétences créées à la première lecture par `Support\GradingCatalog`
  (`config/grading.php`), sous un verrou consultatif (`Support\GradingLock`, aussi pour les notes d'une évaluation).
- Calcul : interface `Contracts\GradingStrategy` choisie d'après `assessment_mode` (`Support\GradingStrategies`) —
  `WeightedAverageStrategy` (notes ramenées sur `CycleSettings::gradeScale`, sur 10 par défaut ; moyennes de matière
  arrondies puis pondérées ; rang de compétition 1, 1, 3 ; moyenne de classe, plus forte, plus faible) et
  `CompetencyStrategy` (nombre de A, EA, NA). Calcul pur, lecture par `Support\GradingResults`.
- Droits : `Support\GradingAccess` — saisir : titulaire (`grades.manage`) ou personnel du cycle avec `grades.manage` ;
  voir : `grades.view` (personnel) ou titulaire ; classe non visible : 404 ; régler périodes, matières et compétences :
  `school.settings.manage` sur le cycle. Année clôturée : 409 `year_closed` ; mode du cycle différent : 409 `wrong_mode` ;
  matière ou compétence déjà utilisée retirée : 409 `subject_used`, `skill_used`.
- Élèves d'une période : `Support\GradingRoster` (inscrits avant la fin, pas partis avant le début).
- Hors connexion (`POST /sync`) : `grades.assessment` (UUID de l'appareil), `grades.save`, `skills.save` ; une saisie est
  datée de son heure sur l'appareil (`updated_at`) et une saisie plus récente n'est jamais écrasée.
- Bulletins (lot 7b) : `appreciations` (générale du titulaire, observation et mention de la direction, `mention_chosen`),
  `subject_appreciations`, `mention_thresholds` (par cycle, sinon `config/grading.php` ramené sur l'échelle :
  `Support\MentionPolicy`), `term_closures` (validation d'une classe pour une période ; une seule ouverte, déverrouillage
  motivé gardé), `report_cards` (PDF par élève et par validation). `Support\TermLock` : période validée → 409
  `term_closed` sur évaluations, notes, compétences et appréciations (en ligne et `/sync`), et sur les coefficients et
  dates d'une période validée ; `TermLock::guard()` dans chaque transaction d'écriture prend le même verrou que la
  validation (pas de saisie qui passe après). `CloseTerm` fige les mentions proposées et enregistre sur chaque bulletin
  la copie de ses données (`report_cards.data`, `Support\ReportCardBuilder` : absences lues dans Attendance), puis met
  en file `Jobs\RenderReportCards` (`TenantAware`) qui rend depuis cette copie (logo ajouté en data URI) → gabarit Blade `resources/views/report-cards/{report_card,skills_booklet}`
  (d'après `report_document`) → `Support\Pdf\PdfRenderer` → fichier privé `report-cards/{uuid}.pdf`
  (`Support\ReportCardFile`, route signée `files.report-card`, 10 minutes). Échec (rendu ou écriture) : `failed`, relance par
  `POST classrooms/{classroom}/report-cards/retry`. Droits : appréciations du titulaire (`grades.manage`), observation,
  mention, validation et déverrouillage (`grades.validate`, personnel du cycle).
- PDF : interface `App\Support\Pdf\PdfRenderer` ; `GotenbergPdfRenderer` (`services.gotenberg.url`, toujours en
  production, refus explicite sans URL) ; `FakePdfRenderer` en test (`GOTENBERG_URL` vide) et sans Docker.

## Fichiers

- Stockage privé (`FILESYSTEM_DISK` : MinIO en local, bucket Railway en production, `Storage::fake()` en test).
  Jamais d'URL de bucket envoyée au client : l'API sert le fichier par une **URL signée relative** (`signed:relative`,
  préfixée par `APP_URL`), courte, et sans identifiant d'école dans le chemin si elle apparaît sur une page publique.
  Exemples : logo d'école (`Tenancy\Support\SchoolLogo`, route `files.school-logo`, 30 minutes, page publique) ;
  photos d'élèves et de tuteurs (`Students\Support\PersonPhoto`, route `files.person-photo`, **10 minutes**, URL
  mise seulement dans les réponses destinées à qui voit l'élève ; `Students\Actions\ManagePhotos`, fichier effacé
  avec le dossier ou le tuteur).
- Images envoyées par les utilisateurs : `Support\Images\WebpImage::fromBytes()` (GD, aucune dépendance) — JPEG, PNG
  ou WebP seulement, redressement selon l'orientation EXIF (photos de téléphone), réduction, réencodage WebP qui
  retire les métadonnées (EXIF, position GPS). Jamais de SVG.
- Tests multipart : `SpaClient::upload($uri, ['champ' => $fichier], $entêtes)`.

## Journal d'audit

- spatie/laravel-activitylog, modèle `App\Support\Audit\Activity` : table `activity_log` avec `school_id` obligatoire et RLS.
- Un modèle se journalise avec le trait `Support\Audit\Auditable` : champs modifiables qui ont changé (`auditInclude()`
  pour des champs non modifiables en masse, `auditExcept()` pour en retirer), auteur = utilisateur connecté.
- École de l'entrée : celle de l'objet (sa colonne `school_id`, ou lui-même pour une école), sinon l'école courante ;
  sans école déterminable, rien n'est écrit (ex. changement de son propre mot de passe hors école).
- Jamais journalisés : `Support\Audit\SensitiveAttributes` (`password`, `remember_token`, `allergies`, `medical_*`,
  `health_*`…), exclus à la source et retirés une seconde fois avant l'écriture. Ajouter ici toute nouvelle colonne sensible.
- Purge (365 jours) : pas encore planifiée ; elle devra passer par `Platform` (la RLS masque tout sans contexte).

## Données de démo

- `DemoSeeder` (appelé par `DatabaseSeeder`) : 2 écoles, un compte par rôle ; comptes et mot de passe dans le README.
- Refus explicite en production (exception avant toute écriture) ; local, staging et tests autorisés.
- Écriture par `Platform::run()` avec des `school_id` explicites (jamais de contournement de la RLS dans `app/`) ;
  idempotent (écoles par slug, comptes par téléphone).

## Migrations

- Une migration par table ou par changement cohérent. Colonnes : `uuid('id')->primary()`, `foreignUuid('school_id')->constrained()->cascadeOnDelete()`,
  `timestamps()`, `softDeletes()` pour élèves, paiements, notes.
- Ajoute la RLS dans la même migration : `Rls::enable('students');`.
- Index composés commençant par `school_id` sur les colonnes filtrées (`['school_id', 'status']`).
- Montants : `bigInteger('amount')` + commentaire `// FCFA`.

## API

- Préfixe `/api/v1`, JSON, noms de champs en `snake_case`, dates ISO 8601.
- Pagination par curseur sur les listes longues (`cursorPaginate`), filtres via query string documentés dans le FormRequest.
- Erreurs : format Laravel standard (422 validation, 403 droit, 404 inexistant ou autre école, 409 conflit métier avec `code`).
- Chaque endpoint est visible dans Scramble : types de retour des Resources explicites, pas de `array` non typé.

## Tests (Pest)

- `tests/Feature/<Domaine>/` : un fichier par ressource HTTP. `tests/Unit/<Domaine>/` : Actions et stratégies.
- Base PostgreSQL réelle en test (pas SQLite) pour que la RLS soit testée. Trait `DatabaseTruncation` (dans `TestCase`), pas
  `RefreshDatabase` : les écoles s'écrivent par la connexion super-admin, invisible depuis une transaction de test sur `pgsql`.
  Les tables sont vidées avant chaque test par `pgsql_owner` ; les connexions sont fermées après chaque test.
- Trois connexions dans `config/database.php` : `pgsql` (rôle `app_user`, soumis à la RLS), `pgsql_owner` (rôle `app_owner`,
  migrations seulement) et `pgsql_platform` (rôle `app_platform`, via `Platform::run()` uniquement).
  `tests/TestCase.php` surcharge `migrateFreshUsing()` pour migrer avec `--database=pgsql_owner` ; les requêtes des tests passent par `pgsql`.
- Helpers (`tests/Pest.php`) : `makeSchool(['kindergarten'])` (`null` = tous les cycles), `inSchool($school, fn)`,
  `assignRole($user, $school, Role::Director, $cycle)` (ou la clé d'un rôle personnalisé), `customRole($school, ['students.view'])`,
  `makeUser()`, `superAdmin()`, `cycleOf($school, 'primary')`,
  `rows($sql)`, `distinctColumn(…)` ; `School::factory()->withCycles()`, `User::factory()->withProvisionalPassword()`.
- Requêtes HTTP authentifiées : `actingAsRole(Role::Director, $school, cycle: $maternelle)` (vraie connexion par session),
  `login($user)`, puis `spa('GET', '/api/v1/cycles', [], $school)`. `Tests\Support\SpaClient` se comporte comme le navigateur
  (en-tête Origin, cookies conservés, garde oublié entre deux requêtes : l'utilisateur est rechargé par le fournisseur soumis
  à la RLS). La `Timebox` de connexion est remplacée par `InstantTimebox` (durée notée, pas attendue).
- CSRF : Laravel ne le vérifie pas pendant les tests ; il est vérifié en conditions réelles (navigateur + API) avant chaque PR
  qui touche à l'authentification.
- Pas de `$this->propriété` dans les tests Pest : variables locales et fonctions de fixture typées (Larastan niveau max sur `tests/`).
- Obligatoire pour chaque ressource : cas nominal, validation, droit refusé, **isolation entre deux écoles**, droit limité par cycle.
- Services externes : toujours les implémentations `Fake`, jamais d'appel réseau en test.

## Commandes

```bash
php artisan test        # tests
vendor/bin/pint                    # formatage
vendor/bin/phpstan analyse         # analyse statique
php artisan scramble:export --path=../docs/api/openapi.json
```
