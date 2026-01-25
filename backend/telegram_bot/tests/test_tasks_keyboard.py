from datetime import datetime

import pytest

from telegram_bot.bot.keyboards.tasks import tasks_keyboard


class DummyProject:
    def __init__(self, name: str):
        self.name = name


class DummyTask:
    def __init__(
        self,
        task_id: int,
        title: str,
        project: DummyProject | None = None,
        due_date: datetime | None = None,
    ):
        self.id = task_id
        self.title = title
        self.project = project
        self.due_date = due_date


@pytest.fixture
def tasks():
    return [
        DummyTask(1, 'Write tests'),
        DummyTask(2, 'Fix CI'),
        DummyTask(3, 'Add pagination'),
        DummyTask(4, 'Refactor services'),
        DummyTask(5, 'Improve UX'),
        DummyTask(6, 'Update docs'),
        DummyTask(7, 'Release v1.0'),
        DummyTask(8, 'Hotfix prod'),
        DummyTask(9, 'Cleanup'),
        DummyTask(10, 'Planning'),
    ]


def test_tasks_keyboard_first_page(tasks):
    keyboard = tasks_keyboard(tasks[:8], page=0, has_next=True, status=None)

    rows = keyboard['inline_keyboard']
    assert len(rows) == 3

    assert rows[0][0]['text'] == 'Write tests'
    assert rows[0][0]['callback_data'] == 'task:1'

    assert rows[1][3]['text'] == 'Hotfix prod'

    nav = rows[2]
    assert nav[0]['text'] == 'Forward ▶'


def test_tasks_keyboard_middle_page(tasks):
    keyboard = tasks_keyboard(tasks[:8], page=1, has_next=True, status='open')
    nav = keyboard['inline_keyboard'][-1]

    assert nav[0]['callback_data'] == 'tasks_page:0:open'
    assert nav[1]['callback_data'] == 'tasks_page:2:open'


def test_tasks_keyboard_last_page(tasks):
    keyboard = tasks_keyboard(tasks[:4], page=2, has_next=False, status=None)
    nav = keyboard['inline_keyboard'][-1]

    assert len(nav) == 1
    assert nav[0]['callback_data'] == 'tasks_page:1:all'


def test_tasks_keyboard_buttons_per_row(tasks):
    keyboard = tasks_keyboard(tasks[:7], page=0, has_next=False, status=None)
    rows = keyboard['inline_keyboard']

    assert len(rows[0]) == 4
    assert len(rows[1]) == 3


def test_tasks_keyboard_callback_data_is_string(tasks):
    keyboard = tasks_keyboard(tasks[:1], page=0, has_next=False, status=None)
    button = keyboard['inline_keyboard'][0][0]

    assert isinstance(button['callback_data'], str)
