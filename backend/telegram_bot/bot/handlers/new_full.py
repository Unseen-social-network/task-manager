from telegram_bot.bot.context import BotContext
from telegram_bot.bot.handlers.base import BaseCommand
from telegram_bot.services.tasks import create_full_task
from telegram_bot.services.telegram_api import send_message

USER_STATES: dict[int, dict] = {}


class NewFullTaskCommand(BaseCommand):
    command = '/newfull'

    async def handle(self, ctx: BotContext) -> None:
        USER_STATES[ctx.chat_id] = {'step': 1}

        await send_message(
            ctx.chat_id,
            '🆕 Создание задачи\n\nШаг 1️⃣ Введите заголовок:',
        )


async def process_fsm(ctx: BotContext) -> bool:
    state = USER_STATES.get(ctx.chat_id)
    if not state:
        return False

    if state['step'] == 1:
        state['title'] = ctx.text
        state['step'] = 2
        await send_message(ctx.chat_id, 'Шаг 2️⃣ Введите описание:')
        return True

    if state['step'] == 2:
        task = await create_full_task(
            ctx.chat_id,
            title=state['title'],
            description=ctx.text,
        )
        USER_STATES.pop(ctx.chat_id, None)

        await send_message(
            ctx.chat_id,
            f'✅ Задача создана\n📝 {task.title}\nID: {task.id}',
        )
        return True

    return False
