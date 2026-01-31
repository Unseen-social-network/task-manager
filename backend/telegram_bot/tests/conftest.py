import pytest

from planner.models import TaskStatus


@pytest.fixture(autouse=True)
def mock_aiohttp_post(monkeypatch):
    """
    Полностью отключает любые HTTP-запросы через aiohttp
    (включая Telegram API)
    """

    class MockResponse:
        status = 200

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def json(self):
            return {}

        def raise_for_status(self):
            return None

    class MockSession:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        def post(self, *args, **kwargs):
            return MockResponse()

    monkeypatch.setattr(
        'aiohttp.ClientSession',
        MockSession,
    )


@pytest.fixture(autouse=True)
def task_statuses(db):
    defaults = [
        {
            'key': 'todo',
            'label': 'To Do',
            'order': 1,
            'is_archived': False,
            'is_done': False,
            'is_default': True,
        },
        {
            'key': 'in_progress',
            'label': 'In Progress',
            'order': 2,
            'is_archived': False,
            'is_done': False,
            'is_default': False,
        },
        {
            'key': 'done',
            'label': 'Done',
            'order': 3,
            'is_archived': True,
            'is_done': True,
            'is_default': False,
        },
        {
            'key': 'canceled',
            'label': 'Canceled',
            'order': 4,
            'is_archived': True,
            'is_done': False,
            'is_default': False,
        },
    ]
    for status in defaults:
        TaskStatus.objects.get_or_create(key=status['key'], defaults=status)
