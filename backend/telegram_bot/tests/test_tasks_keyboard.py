import pytest

from telegram_bot.bot.keyboards.tasks import tasks_keyboard


class DummyTask:
    def __init__(self, task_id: int):
        self.id = task_id


@pytest.fixture
def tasks():
    # 10 фейковых задач
    return [DummyTask(i) for i in range(1, 11)]


def test_tasks_keyboard_first_page(tasks):
    keyboard = tasks_keyboard(
        tasks=tasks[:8],
        page=0,
        has_next=True,
        status=None,
    )

    assert 'inline_keyboard' in keyboard
    rows = keyboard['inline_keyboard']

    # 8 задач → 2 строки + навигация
    assert len(rows) == 3

    # первая строка
    assert rows[0][0]['text'] == '#1'
    assert rows[0][0]['callback_data'] == 'task:1'

    # вторая строка
    assert rows[1][3]['text'] == '#8'

    # навигация
    nav = rows[2]
    assert len(nav) == 1
    assert nav[0]['text'] == 'Forward ▶'


def test_tasks_keyboard_middle_page(tasks):
    keyboard = tasks_keyboard(
        tasks=tasks[:8],
        page=1,
        has_next=True,
        status='open',
    )

    nav = keyboard['inline_keyboard'][-1]

    assert len(nav) == 2

    assert nav[0]['text'] == '◀ Back'
    assert nav[0]['callback_data'] == 'tasks_page:0:open'

    assert nav[1]['text'] == 'Forward ▶'
    assert nav[1]['callback_data'] == 'tasks_page:2:open'


def test_tasks_keyboard_last_page(tasks):
    keyboard = tasks_keyboard(
        tasks=tasks[:4],
        page=2,
        has_next=False,
        status=None,
    )

    nav = keyboard['inline_keyboard'][-1]

    assert len(nav) == 1
    assert nav[0]['text'] == '◀ Back'
    assert nav[0]['callback_data'] == 'tasks_page:1:all'


def test_tasks_keyboard_buttons_per_row(tasks):
    keyboard = tasks_keyboard(
        tasks=tasks[:7],
        page=0,
        has_next=False,
        status=None,
    )

    rows = keyboard['inline_keyboard']

    # первая строка — 4 кнопки
    assert len(rows[0]) == 4

    # вторая строка — 3 кнопки
    assert len(rows[1]) == 3


def test_tasks_keyboard_callback_data_is_string(tasks):
    keyboard = tasks_keyboard(
        tasks=tasks[:1],
        page=0,
        has_next=False,
        status=None,
    )

    button = keyboard['inline_keyboard'][0][0]
    assert isinstance(button['callback_data'], str)
