from django.conf import settings


def build_task_url(task_id: int) -> str:
    base_url = getattr(settings, 'FRONTEND_BASE_URL', '').rstrip('/')
    if not base_url:
        return ''
    return f'{base_url}/tasks?task={task_id}'
