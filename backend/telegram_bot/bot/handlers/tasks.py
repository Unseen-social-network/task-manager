from telegram_bot.bot.context import BotContext
from telegram_bot.bot.handlers.base import BaseCommand
from telegram_bot.services.tasks import list_tasks_for_chat
from telegram_bot.services.telegram_api import send_message


class TasksCommand(BaseCommand):
    command = '/tasks'

    async def handle(self, ctx: BotContext) -> None:
        """
        Формат:
        /tasks
        /tasks todo
        """

        parts = ctx.text.split()
        status = parts[1] if len(parts) > 1 else None

        try:
            tasks = await list_tasks_for_chat(
                chat_id=ctx.chat_id,
                status=status,
                limit=10,
            )
        except ValueError as exc:
            await send_message(ctx.chat_id, f'❌ {exc}')
            return

        if not tasks:
            await send_message(ctx.chat_id, '📭 Задач не найдено.')
            return

        lines = ['📋 Ваши задачи:']
        for task in tasks:
            lines.append(f'• [{task.status}] {task.title} (ID {task.id})')

        await send_message(ctx.chat_id, '\n'.join(lines))
