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

1. Middleware `ResolveSchool` (alias `school`, après `auth:sanctum`) : lit l'en-tête `X-School-Id` (l'API a son propre domaine
   `api.<domaine>`, le sous-domaine de l'école ne sert qu'au frontend). **400** si l'en-tête est absent ou n'est pas un UUID ;
   **404** si l'école n'existe pas ou si l'utilisateur n'y a aucune affectation (même réponse : rien à deviner).
2. Le contexte passe par `App\Support\Tenancy\TenantContext` : `CurrentSchool` côté PHP (liaison `scoped`) et, côté PostgreSQL,
   `set_config('app.school_id', …)` et `set_config('app.user_id', …)` (paramètres liés), lus par les politiques RLS.
   `TenantContext::run($school, fn)` exécute un bloc dans une école puis rétablit le contexte précédent.
3. Remise à zéro : dans un `finally` et dans `terminate()` du middleware, et avant/après **chaque** job (écouteurs de file dans
   `TenancyServiceProvider`). Si la connexion est en erreur, elle est fermée : une session neuve n'a aucun contexte.
4. Le trait `BelongsToSchool` ajoute le scope global (aucune ligne sans école courante), remplit `school_id` à la création
   (exception `MissingTenantContext` sans contexte ou pour une autre école) et interdit de changer `school_id`.
5. RLS en base, en mode fermé, bloque tout ce qui aurait échappé au scope (`App\Support\Database\Rls`).
6. Jobs : implémenter `TenantAware` et utiliser le trait `RunsInSchool` (propriété publique `$schoolId`) ; le middleware de job
   `SetTenantContext` rétablit l'école le temps du job.

Routes hors tenant (super-admin, pré-inscription publique, webhooks) : groupe de routes dédié, sans `ResolveSchool`,
qui fixe explicitement le tenant après vérification (ex. le webhook retrouve l'école depuis la transaction).

### Super-admin (`/api/v1/platform/*`)

- Middleware `super_admin` (`EnsureSuperAdmin`, après `auth:sanctum`) : `users.is_super_admin` (jamais assignable en masse), sinon **404**.
- Lecture et écriture hors RLS uniquement par `Platform::run(fn)` : bascule la connexion par défaut sur `pgsql_platform`
  (rôle de connexion séparé `app_platform`, `BYPASSRLS`), dans une transaction, et rétablit la connexion précédente dans un `finally`.
- Seules les Actions des routes `/api/v1/platform/*` importent `Platform` (test d'architecture `tests/Unit/ArchitectureTest.php`).
  Les modèles chargés dans `Platform::run()` gardent la connexion `pgsql_platform` : ne pas les réutiliser pour écrire ensuite.
- Identifiants `DB_PLATFORM_*` fournis au seul service `api` (ni `worker` ni `scheduler`).

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
  `assignRole($user, $school, Role::Director, $cycle)`, `makeUser()`, `superAdmin()`, `rows($sql)`, `distinctColumn(…)` ;
  `School::factory()->withCycles()`. À venir (étape 4) : `actingAsRole('director', $school, cycle: $maternelle)`.
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
