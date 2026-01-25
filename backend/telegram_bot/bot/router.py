from telegram_bot.bot.handlers import (
    help,
    new_full,
    new_task,
    start,
    task_detail,
    tasks,
)
from telegram_bot.bot.handlers.new_full import process_fsm
from telegram_bot.bot.handlers.unknown import unknown_command

COMMANDS = [
    start.StartCommand(),
    help.HelpCommand(),
    new_task.NewTaskCommand(),
    new_full.NewFullTaskCommand(),
    tasks.TasksCommand(),
    tasks.TasksPageCallback(),
    task_detail.TaskDetailCommand(),
]


async def dispatch(ctx):
    if await process_fsm(ctx):
        return

    if ctx.callback_data:
        for cmd in COMMANDS:
            callback_prefix = getattr(cmd, 'callback_prefix', None)
            if callback_prefix and ctx.callback_data.startswith(callback_prefix):
                await cmd.handle(ctx)
                return
        return

    for cmd in COMMANDS:
        if cmd.match(ctx.text):
            await cmd.handle(ctx)
            return

    await unknown_command(ctx)
