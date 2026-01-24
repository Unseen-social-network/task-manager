from django.conf import settings

TASKS_PER_PAGE = settings.TASKS_PER_PAGE
BUTTONS_PER_ROW = settings.BUTTONS_PER_ROW


def _truncate(text: str, max_len: int = 32) -> str:
    """
    Telegram ограничивает текст кнопки ~64 символами,
    но для UX лучше короче.
    """
    if len(text) <= max_len:
        return text
    return text[: max_len - 1] + '…'


def tasks_keyboard(tasks, page: int, has_next: bool, status: str | None) -> dict:
    keyboard: list[list[dict]] = []
    row: list[dict] = []

    for task in tasks:
        row.append(
            {
                'text': _truncate(f'{task.id}. {task.title}'),
                'callback_data': f'task:{task.id}',
            }
        )

        if len(row) == BUTTONS_PER_ROW:
            keyboard.append(row)
            row = []

    if row:
        keyboard.append(row)

    nav: list[dict] = []

    if page > 0:
        nav.append(
            {
                'text': '◀ Back',
                'callback_data': f'tasks_page:{page - 1}:{status or "all"}',
            }
        )

    if has_next:
        nav.append(
            {
                'text': 'Forward ▶',
                'callback_data': f'tasks_page:{page + 1}:{status or "all"}',
            }
        )

    if nav:
        keyboard.append(nav)

    return {'inline_keyboard': keyboard}
