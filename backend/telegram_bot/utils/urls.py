import os
import sys

from django.conf import settings


def build_task_url(task_id: int) -> str:
    base_url = getattr(settings, 'FRONTEND_BASE_URL', '').rstrip('/')
    if not base_url:
        return ''
    return f'{base_url}/tasks?task={task_id}'


def is_test_env() -> bool:
    return bool(
        os.getenv('USE_SQLITE_FOR_TESTS')
        or os.getenv('PYTEST_CURRENT_TEST')
        or 'test' in sys.argv
    )
