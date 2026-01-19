.PHONY: help build up down restart logs shell migrate makemigrations createsuperuser test lint format clean

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
	@echo "  make test            - Run tests"
	@echo "  make lint            - Run linters"
	@echo "  make format          - Format code"
	@echo "  make clean           - Clean up containers and volumes"
	@echo ""
	@echo "Production commands:"
	@echo "  make prod-build      - Build production images"
	@echo "  make prod-up         - Start production environment"
	@echo "  make prod-down       - Stop production environment"
	@echo "  make prod-logs       - View production logs"

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

# Testing and linting
test:
	docker compose -f infra/compose/docker-compose.yml exec backend pytest -v

test-cov:
	docker compose -f infra/compose/docker-compose.yml exec backend pytest --cov=planner --cov-report=html

lint:
	poetry run ruff check backend/
	poetry run ruff format --check backend/

format:
	poetry run ruff check --fix backend/
	poetry run ruff format backend/

# Production commands
prod-build:
	docker compose -f infra/compose/docker-compose.prod.yml build

prod-up:
	docker compose -f infra/compose/docker-compose.prod.yml up -d
	@echo "Waiting for database..."
	@sleep 5
	docker compose -f infra/compose/docker-compose.prod.yml exec backend python manage.py migrate
	docker compose -f infra/compose/docker-compose.prod.yml exec backend python manage.py collectstatic --no-input
	@echo "\nProduction environment is ready!"
	@echo "Application: http://localhost"

prod-down:
	docker compose -f infra/compose/docker-compose.prod.yml down

prod-logs:
	docker compose -f infra/compose/docker-compose.prod.yml logs -f

# Cleanup
clean:
	docker compose -f infra/compose/docker-compose.yml down -v
	docker compose -f infra/compose/docker-compose.prod.yml down -v
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
