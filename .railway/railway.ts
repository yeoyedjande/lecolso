// Infrastructure Railway en code (remplace railway.json, déprécié par Railway).
// Avant le premier usage :
//   cd .railway && npm ci && railway config plan   (aperçu, ne change rien)
//   railway config apply                                (applique après confirmation)
// Les noms de variables fournies par le bucket et la syntaxe des régions sont à confirmer avec `railway config plan`.
// Exige la CLI Railway 5.42.1 ou plus récente (le moteur IaC est fourni par la CLI).
import { defineRailway, project, service, github, image, database, redis, bucket, group, preserve, ref } from "railway/iac";

const REPO = "yeoyedjande/lecolso";
// Routage par chemin (ADR 0005) : une seule application, https://<hôte>/{slug}/*, aucun sous-domaine par école.
// Le navigateur n'appelle l'API que sur l'origine de l'application (/api/v1, /sanctum : proxy Caddy du service web),
// donc les cookies de session et XSRF-TOKEN sont limités à cet hôte : jamais partagés entre production et staging.
const APP_HOST = { production: "app.ekalewa.com", staging: "staging.ekalewa.com" } as const;
// API publique (webhooks de paiement, intégrations) : production seulement ; l'application ne passe pas par elle.
const PUBLIC_API_HOST = "api.ekalewa.com";
// Port d'écoute de l'API (FrankenPHP), joint par le proxy du service web sur le réseau privé de Railway
const API_PORT = "8080";
const REGION_ID = "europe-west4"; // Amsterdam, la région la plus proche d'Abidjan
const REGION = { [REGION_ID]: 1 };

export default defineRailway((ctx) => {
  const prod = ctx.environment === "production";
  const branch = prod ? "main" : "develop";
  const host = prod ? APP_HOST.production : APP_HOST.staging;
  const origin = `https://${host}`;

  // PostgreSQL 17 (version de la stack, de la CI et du local) ; postgres() du SDK prendrait la 18.
  // Bases créées directement en EU West (une base ne se déplace pas sans risque une fois remplie)
  const db = database("postgres", "postgres", {
    image: "ghcr.io/railwayapp-templates/postgres-ssl:17",
    output: "DATABASE_URL",
    defaultMountPath: "/var/lib/postgresql/data",
    region: REGION_ID,
  });
  const cache = redis("redis", { region: REGION_ID });
  const files = bucket("fichiers", { region: "ams" }); // région non modifiable après création

  // Variables communes aux trois services backend (même image, commandes différentes)
  const backendEnv = {
    RAILWAY_DOCKERFILE_PATH: "docker/production/api.Dockerfile",
    APP_NAME: "EKALEWA",
    APP_ENV: prod ? "production" : "staging",
    APP_KEY: preserve(),
    // Origine publique de l'application (liens envoyés : App\Support\Tenancy\SchoolUrl)
    APP_URL: origin,
    FRONTEND_URL: origin,
    APP_TIMEZONE: "UTC",
    APP_DEBUG: "false",
    // Journaux sur stderr (collectés par Railway), sans le niveau debug
    LOG_CHANNEL: "stderr",
    LOG_LEVEL: "info",

    // Application : rôle app_user, soumis à la RLS (mot de passe défini à la main dans Railway)
    DB_CONNECTION: "pgsql",
    DB_HOST: db.env.PGHOST,
    DB_PORT: db.env.PGPORT,
    DB_DATABASE: db.env.PGDATABASE,
    DB_USERNAME: "app_user",
    DB_PASSWORD: preserve(),
    // Migrations uniquement : rôle propriétaire fourni par Railway
    DB_OWNER_USERNAME: db.env.PGUSER,
    DB_OWNER_PASSWORD: db.env.PGPASSWORD,

    REDIS_URL: cache.env.REDIS_URL,
    // Préfixes Redis figés : sans eux, ils seraient dérivés d'APP_NAME, et changer le nom affiché (EKALEWA)
    // rendrait illisibles les sessions, le cache et les files Horizon déjà en place (déconnexion de tous).
    REDIS_PREFIX: "gestion-ecole-database-",
    CACHE_PREFIX: "gestion-ecole-cache-",
    HORIZON_PREFIX: "gestion_ecole_horizon:",
    QUEUE_CONNECTION: "redis",
    CACHE_STORE: "redis",

    // Authentification SPA par cookie httpOnly (Sanctum), sur la même origine que l'application.
    // SESSION_DOMAIN volontairement vide : cookie limité à l'hôte (app. ou staging.), jamais .ekalewa.com,
    // sinon le cookie de production serait envoyé à staging.ekalewa.com.
    SESSION_DRIVER: "redis",
    SESSION_LIFETIME: "480",
    SESSION_DOMAIN: "null",
    SESSION_COOKIE: prod ? "lecolso_session" : "lecolso_staging_session",
    SESSION_SECURE_COOKIE: "true",
    SESSION_SAME_SITE: "lax",
    SANCTUM_STATEFUL_DOMAINS: host,

    FILESYSTEM_DISK: "s3",
    // Identifiants fournis par le bucket Railway (références, jamais en clair dans le dépôt)
    AWS_ACCESS_KEY_ID: ref(files, "ACCESS_KEY_ID"),
    AWS_SECRET_ACCESS_KEY: ref(files, "SECRET_ACCESS_KEY"),
    AWS_DEFAULT_REGION: ref(files, "REGION"),
    AWS_ENDPOINT: ref(files, "ENDPOINT"),
    AWS_BUCKET: ref(files, "BUCKET"),
    AWS_USE_PATH_STYLE_ENDPOINT: "false",

    GOTENBERG_URL: "http://${{gotenberg.RAILWAY_PRIVATE_DOMAIN}}:3000",

    // Fournisseurs externes : valeurs saisies dans Railway, jamais dans le dépôt
    SMS_API_KEY: preserve(),
    PAYMENT_PROVIDER_KEY: preserve(),
    PAYMENT_WEBHOOK_SECRET: preserve(),
  };

  const api = service("api", {
    source: github(REPO, { branch }),
    // Rôles PostgreSQL (app_user, app_platform), migrations par le propriétaire, puis en staging seulement
    // les comptes de démo (DemoSeeder, idempotent, refusé en production)
    preDeploy: [
      "php artisan db:provision-app-role",
      "php artisan migrate --database=pgsql_owner --force",
      ...(prod ? [] : ["php artisan db:seed --class=DemoSeeder --force"]),
    ].join(" && "),
    healthcheck: "/api/v1/health",
    healthcheckTimeout: 60,
    replicas: REGION,
    // Joint par le proxy du service web (réseau privé) ; domaine public en production seulement
    domains: prod ? [PUBLIC_API_HOST] : [],
    env: {
      ...backendEnv,
      PORT: API_PORT,
      // Super-admin : rôle de connexion séparé app_platform (BYPASSRLS), mot de passe propre.
      // Fourni au seul service api (routes /api/v1/platform/*), jamais à worker ni scheduler.
      DB_PLATFORM_USERNAME: "app_platform",
      DB_PLATFORM_PASSWORD: preserve(),
    },
  });

  const worker = service("worker", {
    source: github(REPO, { branch }),
    start: "php artisan horizon",
    replicas: REGION,
    env: backendEnv,
  });

  const scheduler = service("scheduler", {
    source: github(REPO, { branch }),
    start: "php artisan schedule:work",
    replicas: REGION,
    env: backendEnv,
  });

  const gotenberg = service("gotenberg", {
    source: image("gotenberg/gotenberg:8", { autoUpdates: { type: "minor" } }),
    replicas: REGION,
  });

  const web = service("web", {
    source: github(REPO, { branch }),
    replicas: REGION,
    // Une seule adresse : personnel, parents, enseignants et pages publiques des écoles (/{slug})
    domains: [host],
    env: {
      RAILWAY_DOCKERFILE_PATH: "docker/production/web.Dockerfile",
      // Même origine : /api/* et /sanctum/* relayés par Caddy vers l'API sur le réseau privé
      VITE_API_URL: "/api/v1",
      API_UPSTREAM: `http://\${{api.RAILWAY_PRIVATE_DOMAIN}}:${API_PORT}`,
      // staging : page /design (outils de recette)
      VITE_APP_ENV: prod ? "production" : "staging",
    },
  });

  return project("gestion-ecole", {
    resources: [
      group("Données", [db, cache, files]),
      group("Backend", [api, worker, scheduler, gotenberg]),
      group("Frontend", [web]),
    ],
  });
});
