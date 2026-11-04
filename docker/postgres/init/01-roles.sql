-- Exécuté à la création du volume PostgreSQL (et en CI avant les tests), après 00-test-database.sql.
-- Idempotent : peut être rejoué sur un volume existant avec `make db-roles`.
--
-- app_owner    : propriétaire des tables, utilisé uniquement pour les migrations (contourne la RLS).
-- app_user     : rôle de l'application, soumis à la Row-Level Security.
-- app_platform : rôle de connexion SÉPARÉ des routes super-admin (BYPASSRLS), avec son propre mot de passe.
--                app_user n'en est pas membre et ne peut pas l'endosser (SET ROLE impossible) :
--                une injection SQL sur la connexion applicative ne permet pas de contourner la RLS.
-- Les mêmes droits sont appliqués à la base applicative (gestion_ecole) et à la base de test (gestion_ecole_test).

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'app_user_secret' NOSUPERUSER NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_platform') THEN
    CREATE ROLE app_platform LOGIN PASSWORD 'app_platform_secret'
      NOSUPERUSER BYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
  END IF;
END
$$;

-- Aucune appartenance croisée : ni app_user ni app_platform ne peuvent endosser un autre rôle
DO $$
BEGIN
  IF pg_has_role('app_user', 'app_platform', 'MEMBER') THEN
    REVOKE app_platform FROM app_user;
  END IF;
  IF pg_has_role('app_platform', 'app_user', 'MEMBER') THEN
    REVOKE app_user FROM app_platform;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE gestion_ecole TO app_user, app_platform;
GRANT CONNECT ON DATABASE gestion_ecole_test TO app_user, app_platform;

\connect gestion_ecole

GRANT USAGE ON SCHEMA public TO app_user, app_platform;
REVOKE CREATE ON SCHEMA public FROM app_user, app_platform;

-- Tables déjà créées (rejeu sur un volume existant)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user, app_platform;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user, app_platform;

-- Tables créées plus tard par app_owner (migrations)
ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user, app_platform;
ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user, app_platform;

\connect gestion_ecole_test

GRANT USAGE ON SCHEMA public TO app_user, app_platform;
REVOKE CREATE ON SCHEMA public FROM app_user, app_platform;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user, app_platform;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user, app_platform;

ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user, app_platform;
ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user, app_platform;
