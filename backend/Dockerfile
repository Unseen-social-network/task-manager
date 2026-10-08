# =========================
# base
# =========================
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VIRTUALENVS_CREATE=false

# =========================
# system deps
# =========================
FROM base AS system

# postgresql-client нужен для pg_dump в бэкапах
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    postgresql-client \
 && rm -rf /var/lib/apt/lists/*

# =========================
# poetry (только для установки зависимостей, в runtime не попадает)
# =========================
FROM base AS poetry

# Отдельный venv: сам poetry не смешивается с зависимостями проекта в /usr/local
RUN python -m venv /opt/poetry \
 && /opt/poetry/bin/pip install --no-cache-dir poetry==2.3.1
ENV PATH="/opt/poetry/bin:$PATH"

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
# runtime (dev)
# =========================
FROM system AS dev

WORKDIR /app

COPY --from=deps-dev /usr/local /usr/local
COPY . /app/

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# =========================
# runtime (prod) — последняя стадия, собирается по умолчанию
# =========================
FROM system AS prod

WORKDIR /app

# зависимости
COPY --from=deps-prod /usr/local /usr/local

# pip в runtime не нужен, а его вендорные пакеты попадают в отчёт Trivy
RUN python -m pip uninstall -y pip

# приложение
COPY . /app/
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
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/schema/', timeout=4)"]

CMD ["sh", "-c", "gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers ${GUNICORN_WORKERS} \
  --threads ${GUNICORN_THREADS} \
  --timeout ${GUNICORN_TIMEOUT}"]
