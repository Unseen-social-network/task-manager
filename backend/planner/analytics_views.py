"""API-эндпоинт аналитики на основе ClickHouse (только для staff)."""

from __future__ import annotations

from rest_framework.permissions import IsAdminUser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from planner.analytics import (
    get_activity_by_hour,
    get_daily_active_users,
    get_slow_endpoints,
    get_top_endpoints,
    get_total_stats,
)
from planner.clickhouse_client import is_clickhouse_configured


class UserAnalyticsView(APIView):
    """Поведенческая аналитика пользователей из ClickHouse.

    Доступно только администраторам (is_staff).
    Query params:
        days  — глубина анализа в днях (default: 30, max: 90)
        limit — максимум строк в топах (default: 15, max: 50)
    """

    permission_classes = [IsAdminUser]

    def get(self, request: Request) -> Response:
        if not is_clickhouse_configured():
            return Response(
                {'detail': 'ClickHouse не настроен (CLICKHOUSE_HOST не задан).'},
                status=503,
            )

        try:
            days = min(int(request.query_params.get('days', 30)), 90)
            limit = min(int(request.query_params.get('limit', 15)), 50)
        except (TypeError, ValueError):
            return Response(
                {'detail': 'Параметры days и limit должны быть числами.'}, status=400
            )

        return Response(
            {
                'period_days': days,
                'summary': get_total_stats(days=days),
                'top_endpoints': get_top_endpoints(limit=limit, days=days),
                'activity_by_hour': get_activity_by_hour(days=min(days, 7)),
                'daily_active_users': get_daily_active_users(days=days),
                'slow_endpoints': get_slow_endpoints(limit=10, days=min(days, 7)),
            }
        )
