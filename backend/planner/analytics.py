"""Аналитические запросы к ClickHouse — поведение пользователей."""

from __future__ import annotations

from planner.clickhouse_client import get_clickhouse_client


def get_top_endpoints(limit: int = 15, days: int = 30) -> list[dict]:
    """Топ эндпоинтов по количеству обращений."""
    client = get_clickhouse_client()
    if client is None:
        return []
    result = client.query(
        f"""
        SELECT
            path,
            method,
            count()                     AS hits,
            countDistinct(user_id)      AS unique_users,
            round(avg(duration_ms), 1)  AS avg_ms
        FROM user_events
        WHERE event_time >= now() - INTERVAL {days} DAY
          AND status < 500
        GROUP BY path, method
        ORDER BY hits DESC
        LIMIT {limit}
        """
    )
    return [
        {
            'path': row[0],
            'method': row[1],
            'hits': row[2],
            'unique_users': row[3],
            'avg_ms': row[4],
        }
        for row in result.result_rows
    ]


def get_activity_by_hour(days: int = 7) -> list[dict]:
    """Распределение активности по часам суток (МСК)."""
    client = get_clickhouse_client()
    if client is None:
        return []
    result = client.query(
        f"""
        SELECT
            toHour(toTimeZone(event_time, 'Europe/Moscow')) AS hour,
            count()                                          AS hits,
            countDistinct(user_id)                           AS unique_users
        FROM user_events
        WHERE event_time >= now() - INTERVAL {days} DAY
        GROUP BY hour
        ORDER BY hour
        """
    )
    return [
        {'hour': row[0], 'hits': row[1], 'unique_users': row[2]}
        for row in result.result_rows
    ]


def get_daily_active_users(days: int = 30) -> list[dict]:
    """Ежедневные уникальные активные пользователи."""
    client = get_clickhouse_client()
    if client is None:
        return []
    result = client.query(
        f"""
        SELECT
            toDate(toTimeZone(event_time, 'Europe/Moscow')) AS date,
            countDistinct(user_id)                           AS dau
        FROM user_events
        WHERE event_time >= now() - INTERVAL {days} DAY
        GROUP BY date
        ORDER BY date
        """
    )
    return [{'date': str(row[0]), 'dau': row[1]} for row in result.result_rows]


def get_slow_endpoints(
    limit: int = 10, days: int = 7, threshold_ms: float = 300.0
) -> list[dict]:
    """Самые медленные эндпоинты (avg > threshold_ms)."""
    client = get_clickhouse_client()
    if client is None:
        return []
    result = client.query(
        f"""
        SELECT
            path,
            method,
            round(avg(duration_ms), 1)           AS avg_ms,
            round(quantile(0.95)(duration_ms), 1) AS p95_ms,
            count()                               AS hits
        FROM user_events
        WHERE event_time >= now() - INTERVAL {days} DAY
          AND status < 500
        GROUP BY path, method
        HAVING avg_ms > {threshold_ms}
        ORDER BY avg_ms DESC
        LIMIT {limit}
        """
    )
    return [
        {
            'path': row[0],
            'method': row[1],
            'avg_ms': row[2],
            'p95_ms': row[3],
            'hits': row[4],
        }
        for row in result.result_rows
    ]


def get_total_stats(days: int = 30) -> dict:
    """Общая сводка за период."""
    client = get_clickhouse_client()
    if client is None:
        return {}
    result = client.query(
        f"""
        SELECT
            count()                    AS total_requests,
            countDistinct(user_id)     AS unique_users,
            round(avg(duration_ms), 1) AS avg_response_ms,
            countIf(status >= 500)     AS server_errors
        FROM user_events
        WHERE event_time >= now() - INTERVAL {days} DAY
        """
    )
    if not result.result_rows:
        return {}
    row = result.result_rows[0]
    return {
        'total_requests': row[0],
        'unique_users': row[1],
        'avg_response_ms': row[2],
        'server_errors': row[3],
    }
