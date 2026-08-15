.DEFAULT_GOAL := help
.PHONY: help build build-no-cache up down restart logs shell bash migrate migrate-to makemigrations createsuperuser send-backup load-backup db-copy-dump db-restore test test-cov lint format frontend-install frontend-lint frontend-build frontend-check clean prod-build prod-up prod-down prod-restart prod-logs prod-superuser prod-send-backup prod-load-backup prod-db-copy-dump prod-db-restore prod-ch-dump all-pre-CI

help: ## Показать список целей
	@grep -hE '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# --- Разработка ---------------------------------------------------------------

build: ## Собрать Docker-образы
	DOCKER_BUILDKIT=1 docker compose -f infra/compose/docker-compose.yml build

build-no-cache: ## Собрать Docker-образы без кеша
	DOCKER_BUILDKIT=1 docker compose -f infra/compose/docker-compose.yml build --no-cache

up: ## Запустить окружение разработки
	docker compose -f infra/compose/docker-compose.yml up -d
	@echo "Waiting for database..."
	@sleep 5
	@echo "Skipping migrate (DB restored from dump)"
	docker compose -f infra/compose/docker-compose.yml exec backend python manage.py collectstatic --noinput
	@echo "\nDevelopment environment is ready!"

down: ## Остановить окружение разработки
	docker compose -f infra/compose/docker-compose.yml down

restart: ## Перезапустить сервисы разработки
	docker compose -f infra/compose/docker-compose.yml restart

logs: ## Логи разработки (follow)
	docker compose -f infra/compose/docker-compose.yml logs -f

shell: ## Django shell в backend-контейнере
	docker compose -f infra/compose/docker-compose.yml exec backend python manage.py shell

bash: ## Bash в backend-контейнере
	docker compose -f infra/compose/docker-compose.yml exec backend bash

# --- База данных ----------------------------------------------------------------

migrate: ## Применить миграции
	docker compose -f infra/compose/docker-compose.yml exec backend python manage.py migrate

migrate-to: ## Применить миграции до конкретной версии: make migrate-to VERSION=0014 [APP=...]
	@if [ -z "$(VERSION)" ]; then \
		echo "❌ Usage: make migrate-to VERSION=0014"; \
		exit 1; \
	fi
	docker compose -f infra/compose/docker-compose.yml exec backend python manage.py migrate $(APP) $(VERSION)

makemigrations: ## Создать новые миграции
	docker compose -f infra/compose/docker-compose.yml exec backend python manage.py makemigrations

createsuperuser: ## Создать суперпользователя
	docker compose -f infra/compose/docker-compose.yml exec backend python manage.py createsuperuser

send-backup: ## Отправить дамп БД через Telegram-бота
	docker compose -f infra/compose/docker-compose.yml exec backend python manage.py send_backup_dump

load-backup: ## Восстановить БД из локального .dump: make load-backup DUMP=planner_....dump
	@if [ -z "$(DUMP)" ]; then \
		echo "❌ Usage: make load-backup DUMP=planner_YYYYMMDD_HHMMSS.dump"; \
		exit 1; \
	fi
	docker compose -f infra/compose/docker-compose.yml cp \
		$(DUMP) db:/tmp/$(notdir $(DUMP))
	docker compose -f infra/compose/docker-compose.yml exec db \
		bash -c "pg_restore --clean --if-exists -U planner_user -d planner_db /tmp/$(notdir $(DUMP))"

db-copy-dump: ## Скопировать .dump в контейнер db: make db-copy-dump DUMP=planner_....dump
	@if [ -z "$(DUMP)" ]; then \
		echo "❌ Usage: make db-copy-dump DUMP=planner_YYYYMMDD_HHMMSS.dump"; \
		exit 1; \
	fi
	docker compose -f infra/compose/docker-compose.yml cp \
		$(DUMP) db:/tmp/$(notdir $(DUMP))

db-restore: ## Восстановить БД из уже скопированного .dump: make db-restore DUMP=planner_....dump
	@if [ -z "$(DUMP)" ]; then \
		echo "❌ Usage: make db-restore DUMP=planner_YYYYMMDD_HHMMSS.dump"; \
		exit 1; \
	fi
	docker compose -f infra/compose/docker-compose.yml exec db \
		bash -c "pg_restore --clean --if-exists -U planner_user -d planner_db /tmp/$(notdir $(DUMP))"

# --- Проверки --------------------------------------------------------------------

test: ## Прогнать тесты (SQLite)
	USE_SQLITE_FOR_TESTS=1 poetry run pytest

test-cov: ## Прогнать тесты с отчётом покрытия (в контейнере)
	docker compose -f infra/compose/docker-compose.yml exec backend pytest --cov=planner --cov-report=html

lint: ## Прогнать pre-commit по всему проекту
	poetry run pre-commit run -a

format: ## Отформатировать backend (ruff check --fix + ruff format)
	poetry run ruff check --fix backend/
	poetry run ruff format backend/

frontend-install: ## Установить зависимости фронтенда
	cd frontend && npm install

frontend-lint: ## Линт фронтенда
	cd frontend && npm run lint

frontend-build: ## Сборка фронтенда
	cd frontend && npm run build

frontend-check: frontend-lint frontend-build ## Линт + сборка фронтенда

all-pre-CI: lint test frontend-check ## Все проверки перед коммитом/CI

# --- Прод -------------------------------------------------------------------------

prod-build: ## Собрать прод-образы
	docker compose -f docker-compose.production.yml build

prod-up: ## Поднять прод-окружение
	DOCKER_BUILDKIT=1 docker compose -f docker-compose.production.yml up -d
	@echo "Waiting for database..."
	@sleep 5
	docker compose -f docker-compose.production.yml exec backend python manage.py migrate
	docker compose -f docker-compose.production.yml exec backend python manage.py collectstatic --no-input
	@echo "\nProduction environment is ready!"
	@echo "Application: http://localhost"

prod-down: ## Остановить прод-окружение
	docker compose -f docker-compose.production.yml down

prod-restart: prod-down prod-up ## Перезапустить прод-окружение

prod-logs: ## Логи прод-окружения (follow)
	docker compose -f docker-compose.production.yml logs -f

prod-superuser: ## Создать суперпользователя в проде
	docker compose -f docker-compose.production.yml exec backend python manage.py createsuperuser

prod-send-backup: ## Отправить прод-дамп БД через Telegram-бота
	docker compose -f docker-compose.production.yml exec backend python manage.py send_backup_dump

prod-load-backup: ## Восстановить прод-БД из локального .dump: make prod-load-backup DUMP=planner_....dump
	@if [ -z "$(DUMP)" ]; then \
		echo "❌ Usage: make prod-load-backup DUMP=planner_YYYYMMDD_HHMMSS.dump"; \
		exit 1; \
	fi
	docker compose -f docker-compose.production.yml cp \
		$(DUMP) db:/tmp/$(notdir $(DUMP))
	docker compose -f docker-compose.production.yml exec db \
		bash -c "pg_restore --clean --if-exists -U $$POSTGRES_USER -d $$POSTGRES_DB /tmp/$(notdir $(DUMP))"

prod-db-copy-dump: ## Скопировать .dump в контейнер прод-db: make prod-db-copy-dump DUMP=planner_....dump
	@if [ -z "$(DUMP)" ]; then \
		echo "❌ Usage: make prod-db-copy-dump DUMP=planner_YYYYMMDD_HHMMSS.dump"; \
		exit 1; \
	fi
	docker compose -f docker-compose.production.yml cp \
		$(DUMP) db:/tmp/$(notdir $(DUMP))

prod-db-restore: ## Восстановить прод-БД из уже скопированного .dump: make prod-db-restore DUMP=planner_....dump
	@if [ -z "$(DUMP)" ]; then \
		echo "❌ Usage: make prod-db-restore DUMP=planner_YYYYMMDD_HHMMSS.dump"; \
		exit 1; \
	fi
	docker compose -f docker-compose.production.yml exec db \
		bash -c "pg_restore --clean --if-exists -U $$POSTGRES_USER -d $$POSTGRES_DB /tmp/$(notdir $(DUMP))"

# ClickHouse: BACKUP в каталог из backups.allowed_path (см. clickhouse-backups-allowed.xml), затем cp на хост.
# После первого добавления XML перезапустите clickhouse: docker compose -f docker-compose.production.yml up -d clickhouse
# Пример: make prod-ch-dump  или  make prod-ch-dump OUT_DIR=./my-backups
prod-ch-dump: ## Дамп ClickHouse в OUT_DIR (по умолчанию backups/)
	@set -e; \
	OUT_DIR="$(or $(OUT_DIR),backups)"; \
	mkdir -p "$$OUT_DIR"; \
	TS=$$(date +%Y%m%d_%H%M%S); \
	FNAME="clickhouse_$$TS.zip"; \
	CH_ZIP=/var/lib/clickhouse/backups/clickhouse_manual_dump.zip; \
	docker compose -f docker-compose.production.yml exec -u 0 -T clickhouse \
		sh -c 'mkdir -p /var/lib/clickhouse/backups && chown -R clickhouse:clickhouse /var/lib/clickhouse/backups'; \
	docker compose -f docker-compose.production.yml exec -T clickhouse \
		clickhouse-client --query "BACKUP ALL EXCEPT DATABASES system TO File('$$CH_ZIP')"; \
	docker compose -f docker-compose.production.yml cp \
		"clickhouse:$$CH_ZIP" "$$OUT_DIR/$$FNAME"; \
	docker compose -f docker-compose.production.yml exec -T clickhouse rm -f "$$CH_ZIP"; \
	echo "Saved: $$OUT_DIR/$$FNAME"

# --- Обслуживание --------------------------------------------------------------------

clean: ## Остановить стеки (с томами) и удалить кэши
	docker compose -f infra/compose/docker-compose.yml down -v
	docker compose -f docker-compose.production.yml down -v
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
