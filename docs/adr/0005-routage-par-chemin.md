# ADR 0005 — Routage par chemin, sans sous-domaine par établissement

- Statut : accepté
- Date : 04/11/2026
- Remplace, dans l'ADR 0004, la résolution de l'école par sous-domaine `<slug>.<domaine>`.

## Contexte

Le produit s'appelle EKALEWA, domaine `ekalewa.com`. Le kit prévoyait un sous-domaine par école (`<slug>.<domaine>`),
un cookie de session partagé sur le domaine parent et des requêtes CORS entre `app.` et `api.`. Avec un staging sur
`staging.ekalewa.com`, un cookie posé sur `.ekalewa.com` serait envoyé aux serveurs de staging.

## Décision

| Adresse | Rôle |
| --- | --- |
| `ekalewa.com` | site vitrine (hors de ce dépôt) |
| `app.ekalewa.com` | application SaaS unique (personnel, parents, enseignants, pages publiques des écoles) |
| `api.ekalewa.com` | API publique : webhooks de paiement, intégrations ; production seulement |
| `staging.ekalewa.com` | recette, même routage ; aucune API publique |

- **Aucun sous-domaine par école**, ni en production ni en staging. Chaque établissement a un chemin :
  `https://app.ekalewa.com/{slug}/*`.
  - `/{slug}` : page publique, sans session ni affectation ;
  - `/{slug}/preinscription` : formulaire public ;
  - `/{slug}/tableau-de-bord`, `/{slug}/eleves`, `/{slug}/encaissements`… : administration ;
  - `/{slug}/parent/*`, `/{slug}/enseignant/*` : espaces mobiles.
  - Routes globales, indépendantes des écoles : `/connexion`, `/mot-de-passe`, `/etablissements`, `/plateforme`, `/compte`…
- **Le slug est un identifiant d'URL, jamais une preuve d'autorisation.** Relations en base et en-tête `X-School-Id` :
  l'UUID de l'école (immuable). Le frontend retrouve l'UUID parmi les écoles de `/me` (affectations réelles) ;
  le backend vérifie ensuite l'appartenance (`ResolveSchool`, 404), le rôle et le cycle (Policies) et la RLS.
- **Pages publiques** : résolution par slug sans session, par `GET /api/v1/public/schools/{slug}` (fonction SQL
  `public_school_profile`, SECURITY DEFINER, informations publiables seulement), jamais par `/me`.
- **Slug figé en V1** (aucune route ne le modifie) ; segments réservés, français et anglais, dans `config/tenancy.php`,
  refusés à la création d'une école ; une migration bloque le déploiement si une école existante en porte un.
- **Même origine pour l'API** : le service `web` (Caddy) relaie `/api/*` et `/sanctum/*` vers l'API sur le réseau privé
  Railway. Le frontend appelle `/api/v1`. Cookies de session et `XSRF-TOKEN` limités à l'hôte (`SESSION_DOMAIN` vide) :
  production et staging ne partagent aucun cookie. Plus de CORS ni de requête `OPTIONS` préalable (moins
  d'allers-retours en 3G).
- **Liens envoyés** (e-mail, SMS, WhatsApp, PDF) : uniquement `App\Support\Tenancy\SchoolUrl::to($school, $chemin)`.
- Une seule application frontend et une seule API, une base partagée (RLS), sans instance par école en V1.
  Les groupes scolaires (`Organization`) restent possibles : un utilisateur affecté à plusieurs écoles change de slug.

## Conséquences

- Le backend ne dépend d'aucun nom d'hôte : la résolution du tenant reste l'en-tête `X-School-Id`.
- Les en-têtes `X-Forwarded-*` traversent deux proxys (Railway puis Caddy) : Caddy ne les accepte que du réseau privé
  et transmet à Laravel une seule adresse client (limites de débit par IP) et le schéma `https`.
- Un slug ne peut plus changer sans casser les liens envoyés : un renommage (V2) demandera une table des anciens slugs
  et une redirection.
- Développement local : Vite sur `localhost:5173`, API sur `localhost:8080` (CORS limité à `FRONTEND_URL`).
