from telegram_bot.bot.context import BotContext
from telegram_bot.bot.handlers.base import BaseCommand
from telegram_bot.services.tasks import get_profile_by_chat_id
from telegram_bot.services.telegram_api import send_message


class StartCommand(BaseCommand):
    command = '/start'

    async def handle(self, ctx: BotContext) -> None:
        profile = await get_profile_by_chat_id(ctx.chat_id)

        if profile:
            text = (
                '👋 Вы уже подключены к боту.\n\n'
                'Доступные команды:\n'
                '/help — справка\n'
                '/new — создать задачу\n'
                '/tasks — список задач'
            )
        else:
            text = (
                '👋 Привет!\n\n'
                'Этот бот связан с вашим аккаунтом в системе задач.\n'
                'Чтобы начать, привяжите Telegram в личном кабинете.'
            )

        await send_message(ctx.chat_id, text)
