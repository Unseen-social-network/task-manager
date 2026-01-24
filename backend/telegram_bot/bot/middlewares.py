from telegram_bot.services.tasks import get_profile_by_chat_id
from telegram_bot.services.telegram_api import send_message


async def require_linked(ctx) -> bool:
    """
    Middleware: проверяет, привязан ли Telegram к пользователю.
    Используется в командах бота.
    """
    profile = await get_profile_by_chat_id(ctx.chat_id)
    if not profile:
        await send_message(
            ctx.chat_id,
            '❌ Telegram-аккаунт не привязан.\nПривяжите его в личном кабинете.',
        )
        return False
    return True
