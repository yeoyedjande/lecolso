# Commandes du projet. Les profils Docker s'activent dès que backend/ et frontend/ contiennent leur projet.
PROFILES := $(if $(wildcard backend/artisan),--profile backend,) $(if $(wildcard frontend/package.json),--profile frontend,)
DC       := docker compose $(PROFILES)
APP      := $(DC) exec app
NODE     := $(DC) run --rm --no-deps frontend

.PHONY: up down restart logs sh install migrate fresh test test-back test-front lint lint-back lint-front types check

up: ## Démarre la stack
	$(DC) up -d --build

down: ## Arrête la stack
	$(DC) down

restart: down up

logs: ## Suit les logs
	$(DC) logs -f --tail=100

sh: ## Shell dans le conteneur PHP
	$(APP) sh

install: ## Dépendances PHP et JS
	$(APP) composer install
	$(NODE) npm ci

migrate: ## Migrations (rôle propriétaire) + données de démo
	$(APP) php artisan migrate --database=pgsql_owner --seed

fresh: ## Repart d'une base vide avec les données de démo
	$(APP) php artisan migrate:fresh --database=pgsql_owner --seed

test: test-back test-front

test-back:
	$(APP) php artisan test

test-front:
	$(NODE) npm run test -- --run

lint: lint-back lint-front

lint-back:
	$(APP) vendor/bin/pint --test
	$(APP) vendor/bin/phpstan analyse --memory-limit=1G

lint-front:
	$(NODE) npm run lint
	$(NODE) npm run typecheck

types: ## OpenAPI puis types TypeScript
	$(APP) php artisan scramble:export --path=../docs/api/openapi.json
	$(NODE) npm run api:types

check: lint test types ## À lancer avant de déclarer une tâche terminée
	@echo "Tout est vert. Pense à commiter docs/api/openapi.json et schema.d.ts s'ils ont changé."
