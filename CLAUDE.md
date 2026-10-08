# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Planner: Django 5 + DRF backend (`backend/`), React 18 + Vite + TypeScript + Tailwind frontend (`frontend/`), and a Telegram bot served by the backend through a webhook. PostgreSQL is the main DB. In production, ClickHouse stores user-activity analytics. Python deps are managed with **Poetry**, not uv. README, Makefile help text and code comments are mostly in Russian.

## Commands

All `make` targets are listed with `make help`. The ones used most:

```bash
# Dev stack (infra/compose/docker-compose.yml): db, backend (runserver :8000), frontend (nginx :3000)
make build && make up          # `up` does NOT run migrations; run `make migrate` yourself
docker compose -f infra/compose/docker-compose.yml --profile dev up -d frontend-dev   # Vite hot reload on :3000

# Backend checks (run from the repo root)
make test                      # USE_SQLITE_FOR_TESTS=1 poetry run pytest
make lint                      # pre-commit on all files (ruff, ruff-format, django-upgrade, hygiene hooks)
make format                    # ruff check --fix + ruff format on backend/

# Single test
USE_SQLITE_FOR_TESTS=1 poetry run pytest backend/planner/tests/test_tasks.py::TestName::test_name

# Frontend
make frontend-check            # npm run lint (eslint, --max-warnings 0) + npm run build (tsc && vite build)

make all-pre-CI                # lint + test + frontend-check
```

CI (`.github/workflows/ci.yml`) also runs `python manage.py makemigrations --check --dry-run` from `backend/`. After changing a model, commit the generated migration.

Production uses `docker-compose.production.yml`: db, clickhouse, backend (gunicorn), backup-scheduler, nginx. Targets are `prod-*`, and `prod-up` runs migrate and collectstatic.

## Testing notes

- `pytest.ini` at the repo root takes precedence over `[tool.pytest.ini_options]` in `pyproject.toml`. It sets `pythonpath = backend`, `--reuse-db --nomigrations`, and `testpaths` for both apps.
- `config/settings.py` switches to SQLite (`backend/db.sqlite3`) when `USE_SQLITE_FOR_TESTS` or `PYTEST_CURRENT_TEST` is set, or when `test` is in argv. Tests never need Postgres.
- `config/urls.py` also mounts `telegram_bot.urls` under `/api/` (in addition to `/api/v1/`), but only in the test env. Some tests depend on that legacy prefix.
- Fixtures are in `backend/<app>/tests/conftest.py`. Many task fixtures need `task_statuses`, because tasks reference `TaskStatus` rows.

## Architecture

**Django apps** (`backend/`, settings in `config/`, everything is read from `.env` via django-environ):

- `planner`: the core domain. It holds Contact, Project, Task, TaskStatus, TaskComment, Attachment, Profile, Invite and SiteSetting, plus the sharing models (`ContactShare`/`ProjectShare` and their `*Access` rows, which grant access to shared objects by UUID token). Access control lives in `planner/permissions.py` (`TaskAccessPermission`, `ProjectAccessPermission`, etc.): it covers owners, tagged users and share-access holders, so it goes beyond a plain owner check. All REST routes are under `/api/v1/` (a DRF router plus explicit paths in `planner/urls.py`). Auth uses SimpleJWT (`auth/jwt/create/`, `auth/jwt/refresh/`). The OpenAPI schema is at `/api/schema/swagger-ui/`.
- `planner/signals.py`: auto-creates a `Profile` for each `User`. When users are tagged on a task (FK `tagged_user` or M2M `tagged_users`), it sends them a Telegram notification.
- `planner/middleware.py` (`UserActionLoggingMiddleware`): logs every `/api/` request to the `planner.user_actions` logger. If `CLICKHOUSE_HOST` is set, it also inserts an event into ClickHouse in a background thread pool. `planner/analytics.py` + `analytics_views.py` read those events for the staff-only `/api/v1/analytics/` endpoint. `infra/LOGGING_AND_ANALYTICS.md` has the details.
- `telegram_bot`: Telegram sends updates to `TelegramWebhookView` (`/api/v1/telegram/webhook/`). The view builds a context (`bot/context.py`) and calls `bot/router.py:dispatch` via `async_to_sync`. `dispatch` runs in this order: the `/newfull` FSM (`process_fsm`, state in `bot/state.py`), then callback-query handlers matched by `callback_prefix`, then command handlers (`match(text)`) from the `COMMANDS` list, then `unknown_command`. To add a command, create a handler class in `bot/handlers/` and register it in `COMMANDS`. The other `telegram/*` REST endpoints (quick task, task list, help, link/unlink) are for an external bot client keyed by `chat_id`.
- `telegram_bot/services/`: `telegram_api.py` handles outgoing messages and `tasks.py` handles task creation from the bot. `backup*.py` covers Postgres `pg_dump` plus an optional ClickHouse backup, sent through a separate backup bot. `services/__init__.py` re-exports `send_telegram_message` for backward compatibility. The sibling file `telegram_bot/services.py` is shadowed by the package and never imported.
- Management commands: `send_backup_dump` (one-off backup to Telegram), `run_backup_scheduler` (an APScheduler loop that runs as the `backup-scheduler` container, cron set by `TELEGRAM_BACKUP_CRON`), and `init_clickhouse` (creates the ClickHouse schema).

**Frontend** (`frontend/src`): pages in `pages/`, one API module per resource in `services/*.service.ts`, all using the shared axios instance in `services/api.ts`. That instance attaches the JWT and, on a 401, refreshes the token once through `/api/v1/auth/jwt/refresh/`. Auth state is a zustand store (`contexts/authStore.ts`). i18n strings are in `utils/translations.ts` (locale context). Manager dashboard and risk logic is in `utils/taskInsights.ts`. The `@/` alias points to `src/`. The Vite dev server proxies `/api` to `localhost:8000`. In Docker, nginx (`frontend/nginx.conf`) serves the build and proxies the API.

## Conventions

- Ruff config is in `pyproject.toml`: line length 88, **single quotes**, isort with `force-sort-within-sections`, and migrations excluded. The pre-commit config excludes `frontend/`, `infra/` and migrations.
- Commit messages follow Conventional Commits and are written in Russian. Look at `git log` for the style.
