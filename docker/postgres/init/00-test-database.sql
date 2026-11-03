-- Exécuté une seule fois, à la création du volume PostgreSQL (et en CI avant 01-roles.sql).
-- Base dédiée aux tests (phpunit.xml) : PostgreSQL réel, jamais SQLite, pour que la RLS soit testée.
-- CREATE DATABASE ne peut pas s'exécuter dans un bloc DO : \gexec ne la crée que si elle n'existe pas.

SELECT 'CREATE DATABASE gestion_ecole_test OWNER app_owner'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'gestion_ecole_test')\gexec
