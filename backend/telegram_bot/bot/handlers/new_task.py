from django.utils import timezone

from telegram_bot.bot.context import BotContext
from telegram_bot.bot.handlers.base import BaseCommand
from telegram_bot.services.tasks import create_quick_task
from telegram_bot.services.telegram_api import send_message
from telegram_bot.utils.date_parse import parse_due_date


class NewTaskCommand(BaseCommand):
    command = '/new'

    async def handle(self, ctx: BotContext) -> None:
        """
        Формат:
        /new Заголовок | Описание
        /new Заголовок | Описание | ДД.ММ.ГГГГ
        /new Заголовок | Описание | ДД.ММ.ГГГГ ЧЧ:ММ
        """

        if ctx.text == '/new':
            await send_message(
                ctx.chat_id,
                '❗ Использование:\n'
                '/new Заголовок | Описание\n'
                '/new Заголовок | Описание | ДД.ММ.ГГГГ\n'
                '/new Заголовок | Описание | ДД.ММ.ГГГГ ЧЧ:ММ\n\n'
                'Описание можно не указывать. Срок — опционально.',
            )
            return

        payload = ctx.text[len(self.command) :].strip()
        if not payload:
            await send_message(ctx.chat_id, '❌ Заголовок задачи не указан.')
            return

        parts = [p.strip() for p in payload.split('|')]
        title = parts[0] if parts else ''
        description = parts[1] if len(parts) > 1 else ''
        date_str = parts[2] if len(parts) > 2 else ''

        if not title:
            await send_message(ctx.chat_id, '❌ Заголовок задачи не указан.')
            return

        due_date = None
        if date_str:
            due_date = parse_due_date(date_str)
            if due_date is None:
                await send_message(
                    ctx.chat_id,
                    '❌ Некорректный формат даты. Используйте ДД.ММ.ГГГГ или ДД.ММ.ГГГГ ЧЧ:ММ',
                )
                return

        try:
            task = await create_quick_task(
                chat_id=ctx.chat_id,
                title=title,
                description=description,
                due_date=due_date,
            )
        except ValueError as exc:
            await send_message(ctx.chat_id, f'❌ {exc}')
            return

        msg = f'✅ Задача создана\n\n📝 {task.title}\nID: {task.id}'
        if task.due_date:
            local_dt = (
                timezone.localtime(task.due_date)
                if timezone.is_aware(task.due_date)
                else task.due_date
            )
            msg += f'\nСрок: {local_dt.strftime("%d.%m.%Y")}'
        await send_message(ctx.chat_id, msg)
