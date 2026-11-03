// Infrastructure Railway en code (remplace railway.json, déprécié par Railway).
// Avant le premier usage : remplacer VOTRE-COMPTE et VOTRE-DOMAINE, puis
//   cd .railway && npm install && railway config plan   (aperçu, ne change rien)
//   railway config apply                                (applique après confirmation)
// Les noms de variables fournies par le bucket et la syntaxe des régions sont à confirmer avec `railway config plan`.
import { defineRailway, project, service, github, image, postgres, redis, bucket, group, preserve } from "railway/iac";

const REPO = "VOTRE-COMPTE/gestion-ecole";
const DOMAIN = "VOTRE-DOMAINE.ci";
const REGION = { "europe-west4": 1 }; // Amsterdam, la région la plus proche d'Abidjan

export default defineRailway((ctx) => {
  const prod = ctx.environment === "production";
  const branch = prod ? "main" : "develop";

  const db = postgres("postgres");
  const cache = redis("redis");
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

    FILESYSTEM_DISK: "s3",
    AWS_ACCESS_KEY_ID: files.env.ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: files.env.SECRET_ACCESS_KEY,
    AWS_DEFAULT_REGION: files.env.REGION,
    AWS_ENDPOINT: files.env.ENDPOINT,
    AWS_BUCKET: files.env.BUCKET,
    AWS_USE_PATH_STYLE_ENDPOINT: "false",

    GOTENBERG_URL: "http://${{gotenberg.RAILWAY_PRIVATE_DOMAIN}}:3000",

    // Fournisseurs externes : valeurs saisies dans Railway, jamais dans le dépôt
    SMS_API_KEY: preserve(),
    PAYMENT_PROVIDER_KEY: preserve(),
    PAYMENT_WEBHOOK_SECRET: preserve(),
  };

  const api = service("api", {
    source: github(REPO, { branch }),
    preDeploy: "php artisan db:provision-app-role && php artisan migrate --database=pgsql_owner --force",
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
