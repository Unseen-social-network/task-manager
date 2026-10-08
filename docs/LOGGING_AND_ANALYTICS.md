# Логи и аналитика (заметки на будущее)

Кратко, где что лежит и как развивать, не разыскивая по репозиторию.

## Бэкенд (Django)

- Конфигурация `LOGGING` задаётся в `backend/config/settings.py`: консольный handler, формат `verbose`, логгеры `django` и `planner`.
- Уровень для Django: переменная окружения `DJANGO_LOG_LEVEL` (по умолчанию `INFO`).
- Логгер `planner`: `DEBUG` при `DEBUG=1`, иначе `INFO`.
- **Действия пользователей по API:** middleware [`backend/planner/middleware.py`](../backend/planner/middleware.py) `UserActionLoggingMiddleware` (подключён в `MIDDLEWARE` после `AuthenticationMiddleware`). Для путей с префиксом `/api/` пишет в логгер `planner.user_actions` строку: HTTP-метод, путь с query (обрезка 2048 символов), `user_id` и `username` (через JWT при необходимости), код ответа, длительность в мс. Тела запросов и заголовки не логируются.
- В Docker логи идут в stdout/stderr; сбор через драйвер логов оркестратора или `docker compose logs` без отдельных файлов в образе.

## Фронтенд

- Яндекс.Метрика подключается в `frontend/src/App.tsx`, если задан `VITE_YANDEX_METRIKA_ID` (см. `frontend/README.md` и `frontend/src/vite-env.d.ts`).
- Без ID скрипт не грузится: аналитика опциональна на этапе сборки.

## ClickHouse (production compose)

- Сервис `clickhouse` в `docker-compose.production.yml`: образ `clickhouse/clickhouse-server:24.10`, данные в volume `clickhouse_data`, сеть `planner_network`, healthcheck `clickhouse-client -q 'SELECT 1'`, `ulimits.nofile` 262144. В `backups.allowed_path` подключён файл [`clickhouse-backups-allowed.xml`](../clickhouse-backups-allowed.xml) (каталог `/var/lib/clickhouse/backups` внутри volume) — иначе `BACKUP ... TO File('/tmp/...')` даёт `BAD_ARGUMENTS`. Ручной дамп: `make prod-ch-dump` (после обновления compose перезапустите сервис `clickhouse`).
- Порты 8123/9000 на хост не пробрасываются: доступ только из контейнеров в `planner_network`. Для админки или отладки с хоста можно добавить в compose `ports: ["8123:8123"]`.
- Из других сервисов compose: HTTP `http://clickhouse:8123`, нативный протокол `clickhouse:9000` (hostname совпадает с именем сервиса).
- Переменные: `.env.example` — `CLICKHOUSE_HOST`, `CLICKHOUSE_HTTP_PORT` (для бэкапов в Telegram задайте `CLICKHOUSE_HOST=clickhouse` в prod и том `clickhouse_data:/ch_clickhouse_data` смонтирован только у `backup-scheduler`, который работает от root, чтобы читать и удалять zip-файлы ClickHouse).
- `manage.py send_backup_dump` / `make prod-send-backup` (выполняется в `backup-scheduler`): при включённых Telegram backup и непустом `CLICKHOUSE_HOST` в чат уходят два файла — Postgres и нативный ClickHouse `.zip`.

Проверка синтаксиса compose (нужен файл `.env` рядом с compose, т.к. `backend` и `backup-scheduler` используют `env_file: .env`):

```bash
docker compose -f docker-compose.production.yml config
```

## Следующие шаги интеграции бэкенда

- Заготовка подключения: [`backend/planner/clickhouse_client.py`](../backend/planner/clickhouse_client.py) (`get_clickhouse_client`, `is_clickhouse_configured`). Установить клиент отдельно, например `pip install clickhouse-connect` (версия Python должна удовлетворять ограничениям пакета).
- Описать схемы таблиц (DDL) и способ записи: синхронные INSERT, батчи или отдельный ETL.
- При необходимости доступа с хоста — опубликовать порт `8123` в сервисе `clickhouse`.

## Направления развития

- Структурированные логи (JSON) и единый формат полей облегчают парсинг и загрузку в хранилище аналитики.
- События продукта (просмотры, клики по фичам) имеет смысл сначала проверять на малой выборке или через опросы, прежде чем вкладываться в крупную разработку и инфраструктуру под метрики.
