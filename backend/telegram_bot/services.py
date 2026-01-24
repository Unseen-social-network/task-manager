"""
Backward compatibility слой.

Если где-то в коде уже есть:
from telegram_bot.services import send_telegram_message

оно продолжит работать.
"""

from telegram_bot.services.telegram_api import send_message as send_telegram_message

__all__ = ['send_telegram_message']
