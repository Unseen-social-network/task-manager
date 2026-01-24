from telegram_bot.bot.context import BotContext
from telegram_bot.bot.handlers.base import BaseCommand
from telegram_bot.bot.middlewares import require_linked
from telegram_bot.services.tasks import get_task_for_chat
from telegram_bot.services.telegram_api import send_message


class TaskDetailCommand(BaseCommand):
    command = '/task'

    async def handle(self, ctx: BotContext) -> None:
        if not await require_linked(ctx):
            return

        parts = ctx.text.split()
        if len(parts) != 2 or not parts[1].isdigit():
            await send_message(ctx.chat_id, '❗ Использование: /task <id>')
            return

        task = await get_task_for_chat(ctx.chat_id, int(parts[1]))
        if not task:
            await send_message(ctx.chat_id, '❌ Задача не найдена.')
            return

        await send_message(
            ctx.chat_id,
            f'📝 {task.title}\n'
            f'Статус: {task.status}\n'
            f'Описание: {task.description or "—"}',
        )
