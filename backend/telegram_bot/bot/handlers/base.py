from abc import ABC, abstractmethod

from telegram_bot.bot.context import BotContext


class BaseCommand(ABC):
    """
    Базовый класс для всех команд бота.
    """

    command: str

    def match(self, text: str) -> bool:
        """
        Проверяет, подходит ли команда под входящий текст.
        """
        return text == self.command or text.startswith(self.command + ' ')

    @abstractmethod
    async def handle(self, ctx: BotContext) -> None:
        """
        Основная логика команды.
        """
        raise NotImplementedError
