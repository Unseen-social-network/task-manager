"""Опциональное подключение к ClickHouse по переменным окружения."""

from __future__ import annotations

from datetime import UTC, datetime
import logging
import os
import re
import threading
from typing import Any

logger = logging.getLogger(__name__)

_client: Any | None = None
_client_lock = threading.Lock()

_UUID_RE = re.compile(
    r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', re.I
)
_INT_SEGMENT_RE = re.compile(r'(?<=/)\d+(?=/|$)')

_CREATE_USER_EVENTS_TABLE = """
CREATE TABLE IF NOT EXISTS user_events
(
    event_time  DateTime  DEFAULT now(),
    user_id     UInt32,
    path        String,
    method      LowCardinality(String),
    status      UInt16,
    duration_ms Float32
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (user_id, event_time)
SETTINGS index_granularity = 8192
"""


def is_clickhouse_configured() -> bool:
    return bool(os.getenv('CLICKHOUSE_HOST', '').strip())


def get_clickhouse_client() -> Any | None:
    """HTTP-клиент к ClickHouse (lazy singleton) или None если не настроен."""
    global _client
    if not is_clickhouse_configured():
        return None
    if _client is not None:
        return _client
    with _client_lock:
        if _client is None:
            try:
                import clickhouse_connect  # noqa: PLC0415

                host = os.environ['CLICKHOUSE_HOST'].strip()
                port = int(os.getenv('CLICKHOUSE_HTTP_PORT', '8123'))
                _client = clickhouse_connect.get_client(host=host, port=port)
            except ImportError:
                logger.warning('clickhouse-connect не установлен; аналитика отключена.')
            except Exception:
                logger.exception('Ошибка подключения к ClickHouse')
    return _client


def normalize_path(path: str) -> str:
    """Заменить числовые ID и UUID на плейсхолдеры для группировки в аналитике.

    Пример: /api/v1/tasks/42/comments/ -> /api/v1/tasks/{id}/comments/
    """
    path = path.split('?')[0]
    path = _UUID_RE.sub('{uuid}', path)
    path = _INT_SEGMENT_RE.sub('{id}', path)
    return path


def insert_user_event(
    user_id: int,
    path: str,
    method: str,
    status: int,
    duration_ms: float,
) -> None:
    """Записать событие пользователя в ClickHouse. Никогда не бросает исключений."""
    try:
        client = get_clickhouse_client()
        if client is None:
            return
        client.insert(
            'user_events',
            [
                [
                    datetime.now(UTC).replace(tzinfo=None),
                    user_id,
                    normalize_path(path),
                    method.upper(),
                    status,
                    round(duration_ms, 1),
                ]
            ],
            column_names=[
                'event_time',
                'user_id',
                'path',
                'method',
                'status',
                'duration_ms',
            ],
        )
    except Exception:
        logger.debug('ClickHouse insert failed (non-critical)', exc_info=True)


def ensure_user_events_table() -> None:
    """Создать таблицу user_events если не существует."""
    client = get_clickhouse_client()
    if client is None:
        raise RuntimeError('ClickHouse не настроен (CLICKHOUSE_HOST не задан).')
    client.command(_CREATE_USER_EVENTS_TABLE)
    logger.info('Таблица user_events создана (или уже существует).')
