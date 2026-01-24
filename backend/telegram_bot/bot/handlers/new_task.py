from telegram_bot.bot.context import BotContext
from telegram_bot.bot.handlers.base import BaseCommand
from telegram_bot.services.tasks import create_quick_task
from telegram_bot.services.telegram_api import send_message


class NewTaskCommand(BaseCommand):
    command = '/new'

    async def handle(self, ctx: BotContext) -> None:
        """
        Формат:
        /new Заголовок | Описание
        """

        if ctx.text == '/new':
            await send_message(
                ctx.chat_id,
                '❗ Использование:\n'
                '/new Заголовок | Описание\n\n'
                'Описание можно не указывать.',
            )
            return

        payload = ctx.text[len(self.command) :].strip()
        if not payload:
            await send_message(ctx.chat_id, '❌ Заголовок задачи не указан.')
            return

        if '|' in payload:
            title, description = map(str.strip, payload.split('|', 1))
        else:
            title, description = payload, ''

        try:
            task = await create_quick_task(
                chat_id=ctx.chat_id,
                title=title,
                description=description,
            )
        except ValueError as exc:
            await send_message(ctx.chat_id, f'❌ {exc}')
            return

        await send_message(
            ctx.chat_id,
            f'✅ Задача создана\n\n📝 {task.title}\nID: {task.id}',
        )
