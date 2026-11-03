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
│           └── routes.php      # routes du domaine, chargées par RouteServiceProvider
└── Support/          # code transverse : Rls, Money, Phone, BelongsToSchool, CycleSettings
```

Un domaine n'accède pas aux modèles d'un autre domaine pour écrire : il appelle une Action de ce domaine ou réagit à un événement.
La lecture via relations Eloquent entre domaines est autorisée.

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

1. Middleware `ResolveSchool` : lit l'en-tête `X-School-Id` (l'API a son propre domaine `api.<domaine>`, le sous-domaine de l'école ne sert qu'au frontend),
   vérifie que l'utilisateur a une affectation dans cette école, sinon 404.
2. Il enregistre l'école dans `app(CurrentSchool::class)` et exécute `SET app.school_id = '<uuid>'` sur la connexion.
3. En fin de requête (`terminate`) et après chaque Job, le paramètre est remis à zéro (`RESET app.school_id`).
4. Le trait `BelongsToSchool` ajoute le scope global et remplit `school_id` à la création.
5. RLS en base bloque tout ce qui aurait échappé au scope.

Routes hors tenant (super-admin, pré-inscription publique, webhooks) : groupe de routes dédié, sans `ResolveSchool`,
qui fixe explicitement le tenant après vérification (ex. le webhook retrouve l'école depuis la transaction).

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
- Base PostgreSQL réelle en test (pas SQLite) pour que la RLS soit testée. Trait `RefreshDatabase`.
- Deux connexions dans `config/database.php` : `pgsql` (rôle `app_user`, soumis à la RLS) et `pgsql_owner` (rôle `app_owner`, migrations seulement).
  Dans `tests/TestCase.php`, surcharge `migrateFreshUsing()` pour migrer avec `--database=pgsql_owner` ; les requêtes des tests passent par `pgsql`.
- Helpers disponibles (à créer au sprint 0) : `actingAsRole('director', $school, cycle: $maternelle)`, `School::factory()->withCycles()`.
- Obligatoire pour chaque ressource : cas nominal, validation, droit refusé, **isolation entre deux écoles**, droit limité par cycle.
- Services externes : toujours les implémentations `Fake`, jamais d'appel réseau en test.

## Commandes

```bash
php artisan test        # tests
vendor/bin/pint                    # formatage
vendor/bin/phpstan analyse         # analyse statique
php artisan scramble:export --path=../docs/api/openapi.json
```
