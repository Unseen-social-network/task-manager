from dataclasses import dataclass


@dataclass
class NewTaskState:
    title: str | None = None
    description: str | None = None
