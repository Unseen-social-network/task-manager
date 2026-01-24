# telegram_bot/bot/handlers/unknown.py
from telegram_bot.services.telegram_api import send_message


async def unknown_command(ctx):
    await send_message(
        ctx.chat_id,
        '🤔 Команда не распознана.\nВведите /help',
    )
