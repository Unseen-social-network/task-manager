from dataclasses import dataclass


@dataclass(slots=True)
class BotContext:
    chat_id: int
    text: str
    username: str | None = None
