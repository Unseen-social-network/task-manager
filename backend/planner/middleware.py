"""
Логирование обращений к API (метод, путь, пользователь, статус, длительность).
"""

from __future__ import annotations

from collections.abc import Callable
import logging
import time

from django.http import HttpRequest, HttpResponse
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

log = logging.getLogger('planner.user_actions')

# Не логируем тела запросов и заголовки (в т.ч. пароли); только маршрут и метаданные.
_MAX_PATH_LEN = 2048


def _resolve_user_for_log(request: HttpRequest):
    user = request.user
    if user.is_authenticated:
        return user
    try:
        auth = JWTAuthentication().authenticate(request)
    except (AuthenticationFailed, InvalidToken, TokenError):
        return None
    if auth is None:
        return None
    jwt_user, _token = auth
    return jwt_user


class UserActionLoggingMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        if not request.path.startswith('/api/'):
            return self.get_response(request)

        start = time.monotonic()
        response: HttpResponse | None = None
        try:
            response = self.get_response(request)
            return response
        finally:
            try:
                duration_ms = (time.monotonic() - start) * 1000
                path = request.get_full_path()
                if len(path) > _MAX_PATH_LEN:
                    path = path[: _MAX_PATH_LEN - 3] + '...'

                actor = _resolve_user_for_log(request)
                if actor is not None and getattr(actor, 'is_authenticated', False):
                    user_part = f'user_id={actor.pk} username={actor.get_username()}'
                else:
                    user_part = 'anonymous'

                status_code = response.status_code if response is not None else 500
                log.info(
                    '%s %s %s status=%s duration_ms=%.1f',
                    request.method,
                    path,
                    user_part,
                    status_code,
                    duration_ms,
                )
            except Exception:
                log.exception('planner.user_actions: failed to write access log')
