"""Опциональное подключение к ClickHouse по переменным окружения.

Требуется пакет ``clickhouse-connect`` (не входит в базовые зависимости проекта).
"""

from __future__ import annotations

import os
from typing import Any


def is_clickhouse_configured() -> bool:
    return bool(os.getenv('CLICKHOUSE_HOST', '').strip())


def get_clickhouse_client() -> Any | None:
    """HTTP-клиент к ClickHouse или ``None``, если хост не задан или пакет не установлен."""
    if not is_clickhouse_configured():
        return None
    try:
        import clickhouse_connect
    except ImportError:
        return None
    host = os.environ['CLICKHOUSE_HOST'].strip()
    port = int(os.getenv('CLICKHOUSE_HTTP_PORT', '8123'))
    return clickhouse_connect.get_client(host=host, port=port)
