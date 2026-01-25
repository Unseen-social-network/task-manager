from django.conf import settings

from telegram_bot.bot.context import BotContext
from telegram_bot.bot.handlers.base import BaseCommand
from telegram_bot.bot.keyboards.tasks import tasks_keyboard
from telegram_bot.services.tasks import list_tasks_for_chat
from telegram_bot.services.telegram_api import edit_message, send_message

PAGE_SIZE = settings.PAGE_SIZE


class TasksCommand(BaseCommand):
    command = '/tasks'

    async def handle(self, ctx: BotContext) -> None:
        parts = ctx.text.split()
        status = parts[1] if len(parts) > 1 else 'active'
        page = 0

        offset = page * PAGE_SIZE
        limit = PAGE_SIZE + 1

        tasks = await list_tasks_for_chat(
            chat_id=ctx.chat_id,
            status=status,
            limit=limit,
            offset=offset,
        )

        if not tasks:
            await send_message(ctx.chat_id, '📭 Задач не найдено.')
            return

        has_next = len(tasks) > PAGE_SIZE
        tasks = tasks[:PAGE_SIZE]

        task_lines = '\n'.join(f'{task.id}. {task.title}' for task in tasks)
        message_text = f'📋 Ваши задачи:\n{task_lines}\n\nВыберите номер задачи ниже.'

        await send_message(
            ctx.chat_id,
            message_text,
            reply_markup=tasks_keyboard(tasks, page, has_next, status),
        )


class TasksPageCallback(BaseCommand):
    callback_prefix = 'tasks_page:'

    async def handle(self, ctx: BotContext) -> None:
        _, page, status = ctx.callback_data.split(':')
        page = int(page)
        status = None if status == 'all' else status

        offset = page * PAGE_SIZE
        limit = PAGE_SIZE + 1

        tasks = await list_tasks_for_chat(
            chat_id=ctx.chat_id,
            status=status,
            limit=limit,
            offset=offset,
        )

        has_next = len(tasks) > PAGE_SIZE
        tasks = tasks[:PAGE_SIZE]

        task_lines = '\n'.join(f'{task.id}. {task.title}' for task in tasks)
        message_text = f'📋 Ваши задачи:\n{task_lines}\n\nВыберите номер задачи ниже.'

        await edit_message(
            chat_id=ctx.chat_id,
            message_id=ctx.message_id,
            text=message_text,
            reply_markup=tasks_keyboard(tasks, page, has_next, status),
        )
