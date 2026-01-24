from telegram_bot.services.telegram_api import send_message

# backward compatibility
send_telegram_message = send_message

__all__ = ['send_telegram_message']
