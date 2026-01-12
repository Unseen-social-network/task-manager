.PHONY: lint format test migrate superuser shell compose-up compose-down compose-logs

lint:
	poetry run ruff check .

format:
	poetry run ruff format .

test:
	poetry run pytest

migrate:
	poetry run python backend/manage.py migrate

superuser:
	poetry run python backend/manage.py createsuperuser

shell:
	poetry run python backend/manage.py shell

compose-up:
	docker compose up --build

compose-down:
	docker compose down

compose-logs:
	docker compose logs -f
