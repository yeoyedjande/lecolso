# Gestion École — plateforme SaaS multi-établissements

Plateforme SaaS de gestion d'établissements scolaires privés (Côte d'Ivoire, puis Afrique de l'Ouest francophone).
V1 : garderie, maternelle, primaire. V2 : collège, lycée. V3 : enseignement supérieur (LMD).
Tout le code est écrit avec Claude Code. Ce fichier est la source de vérité des conventions : respecte-le à chaque demande.

Référence fonctionnelle complète : `docs/cahier-des-charges.md`. Décisions d'architecture : `docs/adr/`.
Plan de travail du sprint en cours : `docs/sprints/`.

## Stack

| Couche | Choix |
| --- | --- |
| API | Laravel (dernière version stable), PHP 8.4, API REST `/api/v1` |
| Auth | Laravel Sanctum (tokens), OTP SMS pour les parents, 2FA pour le personnel |
| Base | PostgreSQL 17, Row-Level Security |
| Files / cache | Redis + Laravel Horizon |
| Frontend | React + TypeScript strict + Vite, TanStack Router, TanStack Query, shadcn/ui + Tailwind |
| Mobile | Même frontend en PWA (vite-plugin-pwa, Dexie/IndexedDB pour le hors connexion) |
| PDF | Gotenberg (conteneur), gabarits HTML/Blade |
| Fichiers | Stockage compatible S3 privé : MinIO en local, bucket Railway en production (URL signées uniquement) |
| Code et CI | GitHub, GitHub Actions (`.github/workflows/ci.yml`) |
| Hébergement | Railway, région EU West ; infrastructure en code dans `.railway/railway.ts` ; images dans `docker/production/` |
| Tests | Pest (backend), Vitest + Testing Library (frontend), Playwright (e2e) |
| Qualité | Pint, Larastan niveau max, ESLint, Prettier, `tsc --noEmit` |
| Contrat API | Scramble → `docs/api/openapi.json` → `openapi-typescript` → `frontend/src/lib/api/schema.d.ts` |

N'ajoute pas de dépendance sans le signaler et le justifier dans ta réponse.

## Structure du dépôt

```text
backend/     API Laravel — voir backend/CLAUDE.md
frontend/    Back-office + PWA React — voir frontend/CLAUDE.md
docker/      Environnement local (docker-compose) et images de production (docker/production/)
docs/        Cahier des charges, ADR, plans de sprint, OpenAPI, procédure de déploiement
.github/     Workflow CI
.railway/    Infrastructure Railway en code
```

Déploiement : `docs/deploiement-railway.md`. Ne lance jamais `railway config apply`, ni une commande sur la base de production :
prépare la modification, montre la sortie de `railway config plan`, et laisse-moi appliquer.

## Commandes (depuis la racine)

```bash
make up            # démarre toute la stack Docker
make install       # composer install + npm ci
make migrate       # migrations + seeders de démo
make test          # tous les tests backend + frontend
make lint          # Pint, Larastan, ESLint, tsc
make types         # régénère OpenAPI puis les types TypeScript
make check         # lint + test + types : à lancer avant de déclarer une tâche finie
```

## Vocabulaire du domaine

| Terme métier (FR) | Code (EN) | Remarque |
| --- | --- | --- |
| Établissement / école | `School` (table `schools`) | Le tenant. Porte un `type` : `preschool_primary`, `secondary`, `higher` |
| Groupe scolaire | `Organization` | Regroupe plusieurs établissements d'un même promoteur |
| Cycle | `Cycle` | garderie, maternelle, primaire (V2 : collège, lycée ; V3 : filières) |
| Niveau | `Level` | Crèche, PS, MS, GS, CP1…CM2 |
| Classe | `Classroom` | Niveau + année + section (« CE1 A ») |
| Année scolaire / période | `AcademicYear` / `Term` | Trimestre, semestre ou période libre (type configurable) |
| Élève | `Student` | |
| Tuteur / parent | `Guardian` | Facultatif (V3 : étudiant majeur) |
| Inscription | `Enrollment` | Élève × classe × année. Pivot central : frais, notes, présences s'y rattachent |
| Payeur | `Payer` | Tuteur, élève lui-même ou entreprise. Une facture vise un payeur |
| Facture / paiement | `Invoice` / `Payment` | |
| Évaluation / note | `Assessment` / `Grade` | |
| Compétence | `Skill` / `SkillEvaluation` | Garderie et maternelle |
| Bulletin / livret | `ReportCard` | Rendu par gabarit propre au cycle |
| Présence | `Attendance` | |

Interface utilisateur en français, code (classes, tables, variables) en anglais, commentaires en français si utiles.

## Règles non négociables

### 1. Isolation multi-établissements
- Toute table métier a une colonne `school_id` (uuid, non nulle, indexée, clé étrangère).
- Tout modèle métier utilise le trait `BelongsToSchool` (scope global + remplissage automatique de `school_id`).
- PostgreSQL applique une politique RLS sur `school_id = current_setting('app.school_id')::uuid` pour chaque table métier,
  ajoutée dans la migration même qui crée la table (helper `Rls::enable('table')`).
- L'application se connecte avec un rôle PostgreSQL non propriétaire des tables (`app_user`) ; les migrations tournent avec `app_owner`.
- N'utilise jamais `withoutGlobalScopes()`, `DB::table()` ou du SQL brut sur une table métier sans le justifier dans un commentaire.
- Chaque nouvelle ressource API a un test qui prouve qu'un utilisateur de l'école A ne peut ni lire, ni modifier, ni deviner une ressource de l'école B (réponse 404).

### 2. Droits limités par cycle
- Les rôles sont attribués via `role_assignments (user_id, school_id, role, cycle_id nullable)` ; `cycle_id` nul = tout l'établissement.
- Toute autorisation passe par une Policy qui vérifie le rôle **et** le cycle de la ressource. Pas de contrôle de rôle dans les contrôleurs.

### 3. Argent
- Montants en **entiers** (FCFA / XOF, pas de centimes) : colonnes `bigInteger`, jamais `float` ni `decimal`.
- Un paiement validé est immuable ; une erreur se corrige par une écriture d'annulation.
- Numéros de reçu séquentiels par établissement et par année (`REC-2026-000123`), générés dans une transaction avec verrou.
- Webhooks de paiement : signature vérifiée, traitement idempotent (clé = référence opérateur).

### 4. Extensibilité V2 / V3 (ne rien coder en dur)
- Types de période, modes d'évaluation, modes de présence et périodicité de facturation sont des **paramètres du cycle**
  (`cycles.settings` JSONB validé par une classe `CycleSettings`), jamais des `if ($cycle === 'primaire')`.
- Le calcul des notes passe par l'interface `GradingStrategy` (`CompetencyStrategy`, `WeightedAverageStrategy` en V1 ; `LmdCreditStrategy` en V3).
- Les documents (bulletin, livret, reçu, certificat) sont des gabarits rattachés à un cycle.
- Les modules sont activables par établissement (`schools.features`) ; vérifie la fonctionnalité avant d'exposer une route.

### 5. Données personnelles
- Données d'enfants : ne jamais les journaliser (logs, Sentry) ; masquer téléphones et noms dans les logs.
- Infos médicales et pièces jointes : accès limité aux rôles qui en ont besoin, URL S3 signées et courtes.

### 6. Identifiants et dates
- Clés primaires en UUID ordonnés (trait `HasUuids`) : permet la création côté client hors connexion.
- Dates stockées en UTC, affichées en `Africa/Abidjan`, format JJ/MM/AAAA. Téléphones au format E.164 (`+225…`).

## Manière de travailler

1. Lis la section concernée du cahier des charges et le plan du sprint avant de coder.
2. Pour toute tâche de plus d'un fichier : propose d'abord un plan court (fichiers touchés, migrations, endpoints, tests) et attends validation.
3. Écris les tests avec le code : test d'Action, test HTTP de la route, test d'isolation entre établissements, test de droits par cycle.
4. Lance `make check` et corrige jusqu'à ce que tout passe. Ne déclare jamais une tâche terminée avec un test rouge ou un test désactivé.
5. Si tu modifies l'API, lance `make types` et adapte le frontend dans la même branche.
6. Une fonctionnalité = une branche `feat/<domaine>-<sujet>` partant de `develop` ; commits au format Conventional Commits en français
   (`feat(billing): encaissement au guichet`) ; pull request vers `develop` avec `gh pr create`, CI verte obligatoire.
   `develop` est déployée en staging, `main` en production : seule une pull request `develop` → `main` met en production.
7. Ne modifie jamais une migration déjà fusionnée sur `main` : crée-en une nouvelle.
8. En cas d'ambiguïté métier, pose la question au lieu de deviner, et note la décision dans `docs/decisions-metier.md`.
