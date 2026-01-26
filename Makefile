.PHONY: help build up down restart logs shell migrate makemigrations createsuperuser send-backup test lint format clean prod-superuser prod-send-backup frontend-install frontend-lint frontend-build frontend-check all-pre-CI

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

# Development commands
build:
	DOCKER_BUILDKIT=1 docker compose -f infra/compose/docker-compose.yml build

build-no-cache:
	DOCKER_BUILDKIT=1 docker compose -f infra/compose/docker-compose.yml build --no-cache

up:
	DOCKER_BUILDKIT=1 docker compose -f infra/compose/docker-compose.yml up -d
	@echo "Waiting for database..."
	@sleep 5
	docker compose -f infra/compose/docker-compose.yml exec backend python manage.py migrate
	docker compose -f infra/compose/docker-compose.yml exec backend python manage.py collectstatic --noinput
	@echo "\nDevelopment environment is ready!"
	@echo "Backend: http://localhost:8000"
	@echo "Admin: http://localhost:8000/admin"
	@echo "API Docs: http://localhost:8000/api/schema/swagger-ui/"

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

makemigrations:
	docker compose -f infra/compose/docker-compose.yml exec backend python manage.py makemigrations

createsuperuser:
	docker compose -f infra/compose/docker-compose.yml exec backend python manage.py createsuperuser

send-backup:
	docker compose -f infra/compose/docker-compose.yml exec backend python manage.py send_backup_dump

# Testing and linting
test:
	poetry run pytest

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
