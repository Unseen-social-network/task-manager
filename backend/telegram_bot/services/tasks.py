from asgiref.sync import sync_to_async
from django.db.models import Q

from planner.models import Profile, Task


@sync_to_async
def get_profile_by_chat_id(chat_id: int):
    return (
        Profile.objects.select_related('user').filter(telegram_chat_id=chat_id).first()
    )


@sync_to_async
def create_quick_task(chat_id: int, title: str, description: str) -> Task:
    profile = (
        Profile.objects.select_related('user').filter(telegram_chat_id=chat_id).first()
    )

    if not profile:
        raise ValueError('Telegram-аккаунт не привязан.')

    return Task.objects.create(
        owner=profile.user,
        title=title,
        description=description,
    )


@sync_to_async
def list_tasks_for_chat(
    chat_id: int,
    status: str | None,
    limit: int = 10,
    offset: int = 0,
):
    profile = (
        Profile.objects.select_related('user').filter(telegram_chat_id=chat_id).first()
    )

    if not profile:
        raise ValueError('Telegram-аккаунт не привязан.')

    qs = Task.objects.filter(
        Q(owner=profile.user) | Q(tagged_user=profile.user)
    ).order_by('-created_at')

    if status:
        if status == 'active':
            qs = qs.filter(status__in=['todo', 'in_progress'])
        else:
            qs = qs.filter(status=status)

    return list(qs[offset : offset + limit])


@sync_to_async
def get_task_for_chat(chat_id: int, task_id: int):
    profile = (
        Profile.objects.select_related('user').filter(telegram_chat_id=chat_id).first()
    )
    if not profile:
        return None

    return Task.objects.filter(
        id=task_id,
        owner=profile.user,
    ).first()


@sync_to_async
def create_full_task(chat_id: int, title: str, description: str):
    profile = Profile.objects.select_related('user').get(telegram_chat_id=chat_id)
    return Task.objects.create(
        owner=profile.user,
        title=title,
        description=description,
    )
