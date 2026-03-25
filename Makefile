.PHONY: help build up down restart logs shell migrate makemigrations createsuperuser send-backup load-backup db-copy-dump db-restore test lint format clean prod-build prod-up prod-down prod-restart prod-logs prod-superuser prod-send-backup prod-load-backup prod-db-copy-dump prod-db-restore prod-ch-dump frontend-install frontend-lint frontend-build frontend-check all-pre-CI

# Default target
help:
	@echo "Available commands:"
	@echo "  make build           - Build Docker images"
	@echo "  make up              - Start development environment"
	@echo "  make down            - Stop development environment"
	@echo "  make restart         - Restart services"
	@echo "  make logs            - View logs"
	@echo "  make shell           - Open Django shell"
	@echo "  make bash            - Open bash in backend container"
	@echo "  make migrate         - Run database migrations"
	@echo "  make makemigrations  - Create new migrations"
	@echo "  make createsuperuser - Create superuser"
	@echo "  make send-backup     - Send database dump via Telegram bot"
	@echo "  make load-backup     - Restore database from local .dump file"
	@echo "  make test            - Run tests"
	@echo "  make lint            - Run linters"
	@echo "  make format          - Format code"
	@echo "  make frontend-install - Install frontend dependencies"
	@echo "  make frontend-lint   - Run frontend lint"
	@echo "  make frontend-build  - Build frontend"
	@echo "  make frontend-check  - Run frontend lint + build"
	@echo "  make clean           - Clean up containers and volumes"
	@echo "  make all-pre-CI      - All check"
	@echo ""
	@echo "Production commands:"
	@echo "  make prod-build      - Build production images"
	@echo "  make prod-up         - Start production environment"
	@echo "  make prod-down       - Stop production environment"
	@echo "  make prod-restart    - Restart production environment"
	@echo "  make prod-logs       - View production logs"
	@echo "  make prod-superuser  - Create superuser"
	@echo "  make prod-send-backup - Send production database dump via Telegram bot"
	@echo "  make prod-load-backup - Restore production database from local .dump file"
	@echo "  make prod-db-copy-dump - Copy local .dump file into production DB container"
	@echo "  make prod-ch-dump     - Dump ClickHouse to OUT_DIR (default: backups/)"

# Development commands
build:
	DOCKER_BUILDKIT=1 docker compose -f infra/compose/docker-compose.yml build

build-no-cache:
	DOCKER_BUILDKIT=1 docker compose -f infra/compose/docker-compose.yml build --no-cache

up:
	docker compose -f infra/compose/docker-compose.yml up -d
	@echo "Waiting for database..."
	@sleep 5
	@echo "Skipping migrate (DB restored from dump)"
	docker compose -f infra/compose/docker-compose.yml exec backend python manage.py collectstatic --noinput
	@echo "\nDevelopment environment is ready!"

down:
	docker compose -f infra/compose/docker-compose.yml down

restart:
	docker compose -f infra/compose/docker-compose.yml restart

logs:
	docker compose -f infra/compose/docker-compose.yml logs -f

shell:
	docker compose -f infra/compose/docker-compose.yml exec backend python manage.py shell

bash:
	docker compose -f infra/compose/docker-compose.yml exec backend bash

migrate:
	docker compose -f infra/compose/docker-compose.yml exec backend python manage.py migrate

migrate-to:
	@if [ -z "$(VERSION)" ]; then \
		echo "❌ Usage: make migrate-to VERSION=0014"; \
		exit 1; \
	fi
	docker compose -f infra/compose/docker-compose.yml exec backend python manage.py migrate $(APP) $(VERSION)

makemigrations:
	docker compose -f infra/compose/docker-compose.yml exec backend python manage.py makemigrations

createsuperuser:
	docker compose -f infra/compose/docker-compose.yml exec backend python manage.py createsuperuser

send-backup:
	docker compose -f infra/compose/docker-compose.yml exec backend python manage.py send_backup_dump

load-backup:
	@if [ -z "$(DUMP)" ]; then \
		echo "❌ Usage: make load-backup DUMP=planner_YYYYMMDD_HHMMSS.dump"; \
		exit 1; \
	fi
	docker compose -f infra/compose/docker-compose.yml cp \
		$(DUMP) db:/tmp/$(notdir $(DUMP))
	docker compose -f infra/compose/docker-compose.yml exec db \
		bash -c "pg_restore --clean --if-exists -U planner_user -d planner_db /tmp/$(notdir $(DUMP))"

db-copy-dump:
	@if [ -z "$(DUMP)" ]; then \
		echo "❌ Usage: make db-copy-dump DUMP=planner_YYYYMMDD_HHMMSS.dump"; \
		exit 1; \
	fi
	docker compose -f infra/compose/docker-compose.yml cp \
		$(DUMP) db:/tmp/$(notdir $(DUMP))

db-restore:
	@if [ -z "$(DUMP)" ]; then \
		echo "❌ Usage: make db-restore DUMP=planner_YYYYMMDD_HHMMSS.dump"; \
		exit 1; \
	fi
	docker compose -f infra/compose/docker-compose.yml exec db \
		bash -c "pg_restore --clean --if-exists -U planner_user -d planner_db /tmp/$(notdir $(DUMP))"


# Testing and linting
test:
	USE_SQLITE_FOR_TESTS=1 poetry run pytest

test-cov:
	docker compose -f infra/compose/docker-compose.yml exec backend pytest --cov=planner --cov-report=html

lint:
	poetry run pre-commit run -a

format:
	poetry run ruff check --fix backend/
	poetry run ruff format backend/

frontend-install:
	cd frontend && npm install

frontend-lint:
	cd frontend && npm run lint

frontend-build:
	cd frontend && npm run build

frontend-check: frontend-lint frontend-build

# Production commands
prod-build:
	docker compose -f docker-compose.production.yml build

prod-up:
	DOCKER_BUILDKIT=1 docker compose -f docker-compose.production.yml up -d
	@echo "Waiting for database..."
	@sleep 5
	docker compose -f docker-compose.production.yml exec backend python manage.py migrate
	docker compose -f docker-compose.production.yml exec backend python manage.py collectstatic --no-input
	@echo "\nProduction environment is ready!"
	@echo "Application: http://localhost"

prod-down:
	docker compose -f docker-compose.production.yml down

prod-restart: prod-down prod-up

prod-logs:
	docker compose -f docker-compose.production.yml logs -f

prod-superuser:
	docker compose -f docker-compose.production.yml exec backend python manage.py createsuperuser

prod-send-backup:
	docker compose -f docker-compose.production.yml exec backend python manage.py send_backup_dump

prod-load-backup:
	@if [ -z "$(DUMP)" ]; then \
		echo "❌ Usage: make prod-load-backup DUMP=planner_YYYYMMDD_HHMMSS.dump"; \
		exit 1; \
	fi
	docker compose -f docker-compose.production.yml cp \
		$(DUMP) db:/tmp/$(notdir $(DUMP))
	docker compose -f docker-compose.production.yml exec db \
		bash -c "pg_restore --clean --if-exists -U $$POSTGRES_USER -d $$POSTGRES_DB /tmp/$(notdir $(DUMP))"

prod-db-copy-dump:
	@if [ -z "$(DUMP)" ]; then \
		echo "❌ Usage: make prod-db-copy-dump DUMP=planner_YYYYMMDD_HHMMSS.dump"; \
		exit 1; \
	fi
	docker compose -f docker-compose.production.yml cp \
		$(DUMP) db:/tmp/$(notdir $(DUMP))

prod-db-restore:
	@if [ -z "$(DUMP)" ]; then \
		echo "❌ Usage: make prod-db-restore DUMP=planner_YYYYMMDD_HHMMSS.dump"; \
		exit 1; \
	fi
	docker compose -f docker-compose.production.yml exec db \
		bash -c "pg_restore --clean --if-exists -U $$POSTGRES_USER -d $$POSTGRES_DB /tmp/$(notdir $(DUMP))"

# ClickHouse: встроенный BACKUP в zip внутри контейнера, затем docker compose cp на хост.
# Запуск: из корня репозитория, стек prod уже поднят (make prod-up).
# Пример: make prod-ch-dump  или  make prod-ch-dump OUT_DIR=./my-backups
prod-ch-dump:
	@OUT_DIR="$(or $(OUT_DIR),backups)"; \
	mkdir -p "$$OUT_DIR"; \
	TS=$$(date +%Y%m%d_%H%M%S); \
	FNAME="clickhouse_$$TS.zip"; \
	docker compose -f docker-compose.production.yml exec -T clickhouse \
		clickhouse-client --query "BACKUP ALL EXCEPT DATABASES system TO File('/tmp/clickhouse_manual_dump.zip')"; \
	docker compose -f docker-compose.production.yml cp \
		clickhouse:/tmp/clickhouse_manual_dump.zip "$$OUT_DIR/$$FNAME"; \
	docker compose -f docker-compose.production.yml exec -T clickhouse rm -f /tmp/clickhouse_manual_dump.zip; \
	echo "Saved: $$OUT_DIR/$$FNAME"


# Cleanup
clean:
	docker compose -f infra/compose/docker-compose.yml down -v
	docker compose -f docker-compose.production.yml down -v
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +


# Pre-Ci
all-pre-CI: lint test frontend-check
