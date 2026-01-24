import os

from asgiref.sync import async_to_sync
from django.conf import settings


def _is_test_env() -> bool:
    return bool(os.getenv('PYTEST_CURRENT_TEST') or os.getenv('USE_SQLITE_FOR_TESTS'))


def send_telegram_message(*args, **kwargs):
    """Lazily import the Telegram API client to avoid import-time failures."""
    if _is_test_env() or not getattr(settings, 'TELEGRAM_BOT_TOKEN', ''):
        return None
    from telegram_bot.services.telegram_api import send_message

    return async_to_sync(send_message)(*args, **kwargs)


__all__ = ['send_telegram_message']
