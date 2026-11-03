---
description: Audit des fuites possibles entre établissements et des contrôles de droits par cycle
---

Fais un audit de sécurité multi-établissements du backend, sans modifier le code pendant l'analyse.

Vérifie et liste chaque écart avec fichier et ligne :
1. Tables métier sans `school_id`, sans RLS activée dans leur migration, ou sans index commençant par `school_id`.
2. Modèles métier sans le trait `BelongsToSchool`.
3. Usages de `withoutGlobalScopes`, `withoutGlobalScope`, `DB::table`, `DB::select`, `DB::statement` ou SQL brut sur une table métier.
4. Routes sans middleware `ResolveSchool` hors du groupe explicitement public (webhooks, pré-inscription, super-admin).
5. Contrôleurs ou FormRequests qui n'appellent pas de Policy ; Policies qui ignorent le cycle de la ressource.
6. Jobs qui ne reçoivent pas le `school_id` ou n'utilisent pas `SetTenantContext`.
7. Ressources API sans test d'isolation entre deux écoles ou sans test de droits par cycle.
8. Données personnelles d'enfants envoyées dans les logs, les exceptions ou les réponses d'erreur.
9. Configuration de connexion : l'application doit utiliser `app_user`, jamais `app_owner`.

Termine par un tableau trié par gravité (critique, haute, moyenne) avec la correction proposée, puis demande-moi si tu dois corriger.
