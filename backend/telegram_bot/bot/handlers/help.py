from telegram_bot.bot.context import BotContext
from telegram_bot.bot.handlers.base import BaseCommand
from telegram_bot.services.telegram_api import send_message


class HelpCommand(BaseCommand):
    command = '/help'

    async def handle(self, ctx: BotContext) -> None:
        text = (
            '📌 Команды бота:\n'
            '/help — справка\n'
            '/new Заголовок | Описание — быстрая задача\n'
            '/tasks — список задач\n'
            '/task <id> — задача по ID'
        )
        await send_message(ctx.chat_id, text)
