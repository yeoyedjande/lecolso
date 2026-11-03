# ADR 0001 — Stack technique

- Statut : accepté
- Date : 03/11/2026

## Contexte

SaaS multi-établissements (garderie → supérieur à terme), utilisateurs sur mobile Android et réseau 3G instable,
paiements Mobile Money, développement réalisé à 100 % avec Claude Code et relu par un seul développeur full stack.

## Décision

Laravel (API) + React/TypeScript (back-office et PWA) + PostgreSQL + Redis, déployés en conteneurs Docker.
Contrat API typé de bout en bout : Scramble (OpenAPI) → `openapi-typescript` → types du frontend, vérifié en CI.

## Raisons

- Conventions fortes de Laravel : moins de décisions d'architecture à chaque demande, code uniforme d'un sprint à l'autre.
- Écosystème mûr (Sanctum, Horizon, Pest, Larastan) : moins de code d'infrastructure à générer et à relire.
- PostgreSQL : Row-Level Security pour l'isolation des établissements, JSONB pour les paramètres de cycle.
- PWA plutôt qu'app native en V1 : pas de passage par les stores, une seule base de code, hors connexion via IndexedDB.

## Alternatives écartées

- NestJS + Next.js : viable, mais plus d'infrastructure à assembler et à relire ; l'avantage du typage partagé est obtenu autrement.
- Django + React : solide, écosystème SaaS multi-tenant moins fourni.
