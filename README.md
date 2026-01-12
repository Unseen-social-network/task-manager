# Planner (Django REST API)

Production-ready backend for a personal planner with JWT auth, contacts, tasks, and file attachments.

## Features
- JWT authentication (`/api/v1/auth/jwt/create/`, `/api/v1/auth/jwt/refresh/`).
- Contacts, tasks, and attachments owned by the current user only.
- Filters, search, ordering, pagination.
- File uploads to `MEDIA_ROOT`.
- OpenAPI/Swagger via drf-spectacular (`/api/v1/docs/`).
- Docker Compose for dev/prod, Nginx + Gunicorn in prod.
- CI/CD GitHub Actions (lint, tests, build/push, deploy).

## Project tree
```
.
├── .github/workflows
│   ├── cd.yml
│   └── ci.yml
├── backend
│   ├── config
│   ├── planner
│   ├── entrypoint.sh
│   └── manage.py
├── infra
│   ├── compose
│   │   ├── docker-compose.yml
│   │   └── docker-compose.prod.yml
│   └── docker
│       ├── backend/Dockerfile
│       └── nginx
│           ├── Dockerfile
│           └── nginx.conf
├── docker-compose.yml
├── docker-compose.prod.yml
├── Makefile
├── pyproject.toml
├── poetry.lock
└── README.md
```

## Key files (snippets)

### `infra/compose/docker-compose.yml`
```yaml
services:
  db:
    image: postgres:16
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U planner -d planner"]
  backend:
    build:
      context: ../..
      dockerfile: infra/docker/backend/Dockerfile
    command: ["/app/backend/entrypoint.sh", "python", "manage.py", "runserver", "0.0.0.0:8000"]
```

### `infra/compose/docker-compose.prod.yml`
```yaml
services:
  backend:
    command:
      [
        "/app/backend/entrypoint.sh",
        "gunicorn",
        "config.wsgi:application",
        "--bind",
        "0.0.0.0:8000",
        "--workers",
        "3",
        "--timeout",
        "60"
      ]
  nginx:
    image: nginx:1.25-alpine
```

### `backend/config/settings.py`
```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}
```

### `.github/workflows/ci.yml`
```yaml
- name: Ruff lint
  run: poetry run ruff check .
- name: Pytest
  run: poetry run pytest
```

## API overview
Prefix: `/api/v1/`

- `POST /auth/jwt/create/` — obtain token
- `POST /auth/jwt/refresh/` — refresh token
- `GET/POST /contacts/`
- `GET/PATCH/DELETE /contacts/{id}/`
- `GET/POST /tasks/`
- `GET/PATCH/DELETE /tasks/{id}/`
- `GET/POST /tasks/{id}/attachments/` — upload/list
- `DELETE /attachments/{id}/`

### Filters/search/ordering
- `tasks`: `status`, `urgency`, `contact`, `due_date_after`, `due_date_before`, `created_at_after`, `created_at_before`
- search: `title`, `description`, `contact_freeform`
- ordering: `due_date`, `created_at`, `urgency`

## Local development (Docker Compose)
```bash
cp backend/.env.example backend/.env

docker compose up --build

# in another shell
poetry run python backend/manage.py migrate
poetry run python backend/manage.py createsuperuser
```

Swagger: `http://localhost:8000/api/v1/docs/`

## Production (Docker Compose + Nginx)
```bash
cp backend/.env.example backend/.env

# build and start
docker compose -f docker-compose.prod.yml up -d --build

# migrations/static
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

When deploying images from a registry, set `REGISTRY_URL` and `IMAGE_TAG` environment variables before running compose.

## Example curl

### Obtain JWT
```bash
curl -X POST http://localhost:8000/api/v1/auth/jwt/create/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

### Create contact
```bash
curl -X POST http://localhost:8000/api/v1/contacts/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","company":"Acme","email":"jane@example.com"}'
```

### Create task with contact
```bash
curl -X POST http://localhost:8000/api/v1/tasks/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Call","contact":1,"urgency":"high"}'
```

### Create task with contact_freeform
```bash
curl -X POST http://localhost:8000/api/v1/tasks/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Call","contact_freeform":"VIP client","urgency":"high"}'
```

### Upload attachment
```bash
curl -X POST http://localhost:8000/api/v1/tasks/1/attachments/ \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/file.pdf"
```

### Filters
```bash
curl "http://localhost:8000/api/v1/tasks/?status=todo&urgency=high&ordering=due_date" \
  -H "Authorization: Bearer <token>"
```

## Notes
- Public registration is intentionally not implemented. Create users only via `createsuperuser` and Django admin.
- Users can only access their own contacts, tasks, and attachments.
