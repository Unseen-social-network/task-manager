from dataclasses import dataclass


@dataclass(slots=True)
class BotContext:
    chat_id: int
    text: str | None = None
    username: str | None = None
    callback_data: str | None = None
    message_id: int | None = None
