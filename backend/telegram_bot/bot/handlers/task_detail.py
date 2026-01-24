from telegram_bot.bot.context import BotContext
from telegram_bot.bot.handlers.base import BaseCommand
from telegram_bot.bot.middlewares import require_linked
from telegram_bot.services.tasks import get_task_for_chat
from telegram_bot.services.telegram_api import send_message
from telegram_bot.utils.urls import build_task_url


class TaskDetailCommand(BaseCommand):
    command = '/task'
    callback_prefix = 'task:'

    async def handle(self, ctx: BotContext) -> None:
        if not await require_linked(ctx):
            return
        task_id: int | None = None

        if ctx.callback_data:
            # callback_data = "task:123"
            _, raw_id = ctx.callback_data.split(':', 1)
            if raw_id.isdigit():
                task_id = int(raw_id)

        elif ctx.text:
            parts = ctx.text.split()
            if len(parts) == 2 and parts[1].isdigit():
                task_id = int(parts[1])

        if not task_id:
            await send_message(ctx.chat_id, '❗ Использование: /task <id>')
            return

        task = await get_task_for_chat(ctx.chat_id, task_id)
        if not task:
            await send_message(ctx.chat_id, '❌ Задача не найдена.')
            return

        task_url = build_task_url(task.id)

        text = (
            f'📝 <b>{task.title}</b>\n'
            f'Статус: <b>{task.status}</b>\n'
            f'Описание: {task.description or "—"}'
        )
        reply_markup = None
        if task_url:
            reply_markup = {
                'inline_keyboard': [[{'text': '🔗 Открыть в вебе', 'url': task_url}]]
            }

        await send_message(
            ctx.chat_id,
            text,
            parse_mode='HTML',
            reply_markup=reply_markup,
            disable_web_page_preview=True,
        )
