from django.utils import timezone

from telegram_bot.bot.context import BotContext
from telegram_bot.bot.handlers.base import BaseCommand
from telegram_bot.services.tasks import (
    create_full_task,
    get_projects_for_user,
    resolve_usernames_to_users,
)
from telegram_bot.services.telegram_api import send_message
from telegram_bot.utils.date_parse import parse_due_date

USER_STATES: dict[int, dict] = {}

SKIP_WORDS = ('пропустить', 'пропуск', '-', 'нет', 'skip')
STEP_TITLE = 1
STEP_DESCRIPTION = 2
STEP_PROJECT = 3
STEP_COLLEAGUES = 4
STEP_DUE_DATE = 5


def _is_skip(text: str | None) -> bool:
    if not text:
        return False
    return text.strip().lower() in SKIP_WORDS or text.strip() == '0'


def _is_cancel(text: str | None) -> bool:
    if not text:
        return False
    return text.strip().lower() in ('/cancel', 'отмена', 'cancel')


class NewFullTaskCommand(BaseCommand):
    command = '/newfull'

    async def handle(self, ctx: BotContext) -> None:
        USER_STATES[ctx.chat_id] = {'step': STEP_TITLE}

        await send_message(
            ctx.chat_id,
            '🆕 Создание задачи (пошагово)\n\n'
            'Шаг 1️⃣ Введите заголовок:\n'
            '(Для отмены введите /cancel)',
        )


async def _handle_step_title(ctx: BotContext, state: dict) -> bool:
    state['title'] = ctx.text.strip()
    if not state['title']:
        await send_message(ctx.chat_id, '❌ Заголовок не может быть пустым.')
        return True
    state['step'] = STEP_DESCRIPTION
    await send_message(ctx.chat_id, 'Шаг 2️⃣ Введите описание (или пропустите):')
    return True


async def _handle_step_description(ctx: BotContext, state: dict) -> bool:
    state['description'] = ctx.text.strip() if ctx.text else ''
    state['step'] = STEP_PROJECT

    projects = await get_projects_for_user(ctx.chat_id)
    if not projects:
        state['step'] = STEP_COLLEAGUES
        await send_message(
            ctx.chat_id,
            'Шаг 3️⃣ Укажите коллег через @username через запятую (или пропустите):',
        )
    else:
        lines = ['Шаг 3️⃣ Выберите проект (номер) или пропустите:']
        for i, p in enumerate(projects, 1):
            lines.append(f'  {i}. {p.name}')
        state['_projects'] = projects
        await send_message(ctx.chat_id, '\n'.join(lines))
    return True


async def _handle_step_project(ctx: BotContext, state: dict) -> bool:
    if _is_skip(ctx.text or ''):
        state['project_id'] = None
    else:
        try:
            idx = int((ctx.text or '').strip())
            projects = state.get('_projects', [])
            if 1 <= idx <= len(projects):
                state['project_id'] = projects[idx - 1].id
            else:
                await send_message(
                    ctx.chat_id,
                    '❌ Неверный номер. Введите число из списка или пропустите.',
                )
                return True
        except ValueError:
            await send_message(ctx.chat_id, '❌ Введите номер проекта или пропустите.')
            return True
    state.pop('_projects', None)
    state['step'] = STEP_COLLEAGUES
    await send_message(
        ctx.chat_id,
        'Шаг 4️⃣ Укажите коллег через @username через запятую (или пропустите):',
    )
    return True


async def _handle_step_colleagues(ctx: BotContext, state: dict) -> bool:
    if _is_skip(ctx.text or ''):
        state['tagged_users'] = []
    else:
        usernames = [u.strip() for u in (ctx.text or '').split(',') if u.strip()]
        if usernames:
            users = await resolve_usernames_to_users(usernames)
            found = {u.username for u in users}
            invalid = [u for u in usernames if u.strip().lstrip('@') not in found]
            if invalid:
                await send_message(
                    ctx.chat_id,
                    f'⚠️ Не найдены: {", ".join(invalid)}\nОстальные добавлены.',
                )
            state['tagged_users'] = users
        else:
            state['tagged_users'] = []
    state['step'] = STEP_DUE_DATE
    await send_message(
        ctx.chat_id,
        'Шаг 5️⃣ Введите срок в формате ДД.ММ.ГГГГ (или пропустите):',
    )
    return True


async def _handle_step_due_date(ctx: BotContext, state: dict) -> bool:
    if _is_skip(ctx.text or ''):
        state['due_date'] = None
    else:
        due_date = parse_due_date(ctx.text or '')
        if (ctx.text or '').strip() and due_date is None:
            await send_message(
                ctx.chat_id,
                '❌ Некорректная дата. Используйте ДД.ММ.ГГГГ или пропустите.',
            )
            return True
        state['due_date'] = due_date

    try:
        task = await create_full_task(
            ctx.chat_id,
            title=state['title'],
            description=state.get('description', ''),
            project_id=state.get('project_id'),
            tagged_users=state.get('tagged_users') or [],
            due_date=state.get('due_date'),
        )
    except ValueError as exc:
        await send_message(ctx.chat_id, f'❌ {exc}')
    else:
        msg = f'✅ Задача создана\n📝 {task.title}\nID: {task.id}'
        if task.project:
            msg += f'\n📁 Проект: {task.project.name}'
        if task.tagged_users.exists():
            tags = ', '.join(f'@{u.username}' for u in task.tagged_users.all())
            msg += f'\n👥 Коллеги: {tags}'
        if task.due_date:
            local_dt = (
                timezone.localtime(task.due_date)
                if timezone.is_aware(task.due_date)
                else task.due_date
            )
            msg += f'\n📅 Срок: {local_dt.strftime("%d.%m.%Y")}'
        await send_message(ctx.chat_id, msg)

    USER_STATES.pop(ctx.chat_id, None)
    return True


async def process_fsm(ctx: BotContext) -> bool:
    state = USER_STATES.get(ctx.chat_id)
    if not state:
        return False

    if _is_cancel(ctx.text):
        USER_STATES.pop(ctx.chat_id, None)
        await send_message(ctx.chat_id, '❌ Создание задачи отменено.')
        return True

    handlers = {
        STEP_TITLE: _handle_step_title,
        STEP_DESCRIPTION: _handle_step_description,
        STEP_PROJECT: _handle_step_project,
        STEP_COLLEAGUES: _handle_step_colleagues,
        STEP_DUE_DATE: _handle_step_due_date,
    }
    handler = handlers.get(state['step'])
    if handler:
        return await handler(ctx, state)
    return False
