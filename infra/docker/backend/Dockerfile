# =========================
# base
# =========================
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VERSION=2.3.1 \
    POETRY_HOME=/opt/poetry \
    POETRY_VIRTUALENVS_CREATE=false \
    PATH="/opt/poetry/bin:$PATH"

# =========================
# system deps
# =========================
FROM base AS system

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    curl \
    postgresql-client \
 && rm -rf /var/lib/apt/lists/*

# =========================
# poetry
# =========================
FROM system AS poetry

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN curl -sSL https://install.python-poetry.org | python3 - \
 && poetry --version

# =========================
# deps (prod)
# =========================
FROM poetry AS deps-prod

WORKDIR /app

COPY pyproject.toml poetry.lock* ./
RUN poetry install \
    --only main \
    --no-root \
    --no-interaction \
    --no-ansi

# =========================
# deps (dev)
# =========================
FROM poetry AS deps-dev

WORKDIR /app

COPY pyproject.toml poetry.lock* ./
RUN poetry install \
    --with dev \
    --no-root \
    --no-interaction \
    --no-ansi

# =========================
# runtime (prod)
# =========================
FROM system AS prod

WORKDIR /app

# зависимости
COPY --from=deps-prod /usr/local /usr/local

# приложение
COPY backend/ /app/
RUN mkdir -p /app/media /app/staticfiles

# пользователь
RUN addgroup --system app \
 && adduser --system --ingroup app app \
 && chown -R app:app /app

USER app

ENV GUNICORN_WORKERS=3 \
    GUNICORN_THREADS=2 \
    GUNICORN_TIMEOUT=60

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
 CMD curl -f http://localhost:8000/health/ || exit 1

CMD ["sh", "-c", "gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers ${GUNICORN_WORKERS} \
  --threads ${GUNICORN_THREADS} \
  --timeout ${GUNICORN_TIMEOUT}"]

# =========================
# runtime (dev)
# =========================
FROM system AS dev

WORKDIR /app

COPY --from=deps-dev /usr/local /usr/local
COPY backend/ /app/

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
