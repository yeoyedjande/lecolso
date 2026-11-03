-- Exécuté une seule fois, à la création du volume PostgreSQL (et en CI avant les tests).
-- app_owner : propriétaire des tables, utilisé uniquement pour les migrations (contourne la RLS).
-- app_user  : rôle de l'application, soumis à la Row-Level Security.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'app_user_secret' NOSUPERUSER NOBYPASSRLS;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE gestion_ecole TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;

-- Droits sur les tables créées plus tard par app_owner (migrations)
ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;
