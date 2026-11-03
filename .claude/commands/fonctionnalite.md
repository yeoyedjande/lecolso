---
description: Développer une fonctionnalité de bout en bout selon les conventions du projet
argument-hint: <description de la fonctionnalité>
---

Fonctionnalité à développer : $ARGUMENTS

1. Lis `CLAUDE.md`, `backend/CLAUDE.md`, `frontend/CLAUDE.md`, la section concernée de `docs/cahier-des-charges.md` et le plan du sprint dans `docs/sprints/`.
2. Crée la branche `feat/<domaine>-<sujet>`.
3. Propose un plan court et attends ma validation :
   - migrations (avec `school_id`, RLS, index), modèles, Actions, endpoints, Policies ;
   - écrans et composants frontend ;
   - liste des tests, dont **isolation entre deux écoles** et **droits limités par cycle** ;
   - questions métier ouvertes.
4. Après validation : backend d'abord (tests compris), puis `make types`, puis frontend (tests compris).
5. Lance `make check` et corrige jusqu'à ce que tout soit vert.
6. Note toute décision métier prise dans `docs/decisions-metier.md`.
7. Résume ce qui a été fait, les fichiers clés et ce qu'il me reste à vérifier à la main, puis propose le message de commit.
