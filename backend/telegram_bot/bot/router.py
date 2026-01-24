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
    task_detail.TaskDetailCommand(),
]


async def dispatch(ctx):
    if await process_fsm(ctx):
        return

    for cmd in COMMANDS:
        if cmd.match(ctx.text):
            await cmd.handle(ctx)
            return

    await unknown_command(ctx)
