from django.conf import settings

TASKS_PER_PAGE = settings.TASKS_PER_PAGE
BUTTONS_PER_ROW = settings.BUTTONS_PER_ROW


def tasks_keyboard(tasks, page: int, has_next: bool, status: str | None) -> dict:
    keyboard: list[list[dict]] = []
    row: list[dict] = []

    for task in tasks:
        row.append(
            {
                'text': f'#{task.id}',
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
