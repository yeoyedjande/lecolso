// Infrastructure Railway en code (remplace railway.json, déprécié par Railway).
// Avant le premier usage : remplacer VOTRE-DOMAINE et VOTRE-DOMAINE-STAGING, puis
//   cd .railway && npm install && railway config plan   (aperçu, ne change rien)
//   railway config apply                                (applique après confirmation)
// Les noms de variables fournies par le bucket et la syntaxe des régions sont à confirmer avec `railway config plan`.
// Exige la CLI Railway 5.42.1 ou plus récente (le moteur IaC est fourni par la CLI).
import { defineRailway, project, service, github, image, database, redis, bucket, group, preserve, ref } from "railway/iac";

const REPO = "yeoyedjande/lecolso";
// Domaine propre obligatoire : le cookie de session est partagé entre api.<domaine> et app.<domaine>,
// impossible sur *.up.railway.app (suffixe public : aucun cookie commun entre deux sous-domaines).
const PRODUCTION_DOMAIN = "VOTRE-DOMAINE.ci";
// Staging sur un domaine DISTINCT, jamais staging.<domaine> : le cookie de session de production est posé sur
// .<domaine> et serait alors envoyé aux serveurs de staging. Mêmes enregistrements DNS : api., app. et *.
const STAGING_DOMAIN = "VOTRE-DOMAINE-STAGING.ci";
const REGION_ID = "europe-west4"; // Amsterdam, la région la plus proche d'Abidjan
const REGION = { [REGION_ID]: 1 };

export default defineRailway((ctx) => {
  const prod = ctx.environment === "production";
  const branch = prod ? "main" : "develop";
  const DOMAIN = prod ? PRODUCTION_DOMAIN : STAGING_DOMAIN;

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
    APP_NAME: "Gestion École",
    APP_ENV: prod ? "production" : "staging",
    APP_KEY: preserve(),
    APP_URL: `https://api.${DOMAIN}`,
    FRONTEND_URL: `https://app.${DOMAIN}`,
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
    QUEUE_CONNECTION: "redis",
    CACHE_STORE: "redis",

    // Authentification SPA par cookie httpOnly (Sanctum) : app.<domaine> et api.<domaine> partagent le domaine principal
    SESSION_DRIVER: "redis",
    SESSION_LIFETIME: "480",
    SESSION_DOMAIN: `.${DOMAIN}`,
    SESSION_COOKIE: prod ? "lecolso_session" : "lecolso_staging_session",
    SESSION_SECURE_COOKIE: "true",
    SESSION_SAME_SITE: "lax",
    SANCTUM_STATEFUL_DOMAINS: `app.${DOMAIN},*.${DOMAIN}`,
    // CORS avec cookies : FRONTEND_URL (ci-dessus) et les pages des écoles <slug>.<domaine>
    CORS_ALLOWED_ORIGIN_PATTERN: `#^https://[a-z0-9-]+\\.${DOMAIN.replaceAll(".", "\\.")}$#`,

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
    domains: [`api.${DOMAIN}`],
    env: {
      ...backendEnv,
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
    // app.<domaine> pour le personnel ; *.<domaine> pour la page de chaque école (<slug>.<domaine>)
    domains: [`app.${DOMAIN}`, `*.${DOMAIN}`],
    env: {
      RAILWAY_DOCKERFILE_PATH: "docker/production/web.Dockerfile",
      VITE_API_URL: `https://api.${DOMAIN}/api/v1`,
      // staging : page /design et données de démonstration des modules sans backend
      VITE_APP_ENV: prod ? "production" : "staging",
      VITE_DEMO_MODULES: prod ? "false" : "true",
      VITE_TENANT_DOMAIN: DOMAIN,
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
