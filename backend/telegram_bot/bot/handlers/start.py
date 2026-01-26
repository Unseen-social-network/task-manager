import uuid

from telegram_bot.bot.context import BotContext
from telegram_bot.bot.handlers.base import BaseCommand
from telegram_bot.services.tasks import get_profile_by_chat_id, link_profile_by_token
from telegram_bot.services.telegram_api import send_message


class StartCommand(BaseCommand):
    command = '/start'

    async def handle(self, ctx: BotContext) -> None:
        payload = None
        if ctx.text:
            parts = ctx.text.strip().split(maxsplit=1)
            if parts and parts[0] == '/start' and len(parts) > 1:
                payload = parts[1]

        if payload:
            try:
                link_token = uuid.UUID(payload)
            except ValueError:
                await send_message(
                    ctx.chat_id,
                    '❌ Ссылка для привязки недействительна. '
                    'Сгенерируйте новую ссылку в личном кабинете.',
                )
                return

            _, error = await link_profile_by_token(
                link_token=link_token,
                chat_id=ctx.chat_id,
                telegram_username=ctx.username,
            )
            if error == 'missing':
                text = (
                    '❌ Ссылка для привязки недействительна или устарела.\n'
                    'Сгенерируйте новую ссылку в личном кабинете.'
                )
            elif error == 'token_used':
                text = (
                    '❌ Эта ссылка уже использована для привязки другого чата.\n'
                    'Сгенерируйте новую ссылку в личном кабинете.'
                )
            elif error == 'chat_in_use':
                text = (
                    '❌ Этот чат уже привязан к другому аккаунту.\n'
                    'Если это ошибка — сначала отключите привязку в личном кабинете.'
                )
            else:
                text = (
                    '✅ Telegram успешно привязан!\n\n'
                    'Доступные команды:\n'
                    '/help — справка\n'
                    '/new — создать задачу\n'
                    '/tasks — список задач'
                )

            await send_message(ctx.chat_id, text)
            return

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
