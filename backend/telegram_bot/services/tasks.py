import uuid

from asgiref.sync import sync_to_async
from django.db.models import Q
from django.utils import timezone

from planner.models import Profile, Task, TaskStatus


@sync_to_async
def get_profile_by_chat_id(chat_id: int):
    return (
        Profile.objects.select_related('user').filter(telegram_chat_id=chat_id).first()
    )


@sync_to_async
def link_profile_by_token(
    link_token: uuid.UUID,
    chat_id: int,
    telegram_username: str | None = None,
):
    profile = (
        Profile.objects.select_related('user')
        .filter(telegram_link_token=link_token)
        .first()
    )
    if not profile:
        return None, 'missing'

    if profile.telegram_chat_id and profile.telegram_chat_id != chat_id:
        return None, 'token_used'

    if Profile.objects.filter(telegram_chat_id=chat_id).exclude(id=profile.id).exists():
        return None, 'chat_in_use'

    normalized_username = ''
    if telegram_username:
        normalized_username = telegram_username.strip().lstrip('@')
        if normalized_username:
            normalized_username = f'@{normalized_username}'

    profile.telegram_chat_id = chat_id
    profile.telegram_username = normalized_username
    profile.telegram_linked_at = timezone.now()
    profile.telegram_link_token = uuid.uuid4()
    profile.save(
        update_fields=[
            'telegram_chat_id',
            'telegram_username',
            'telegram_linked_at',
            'telegram_link_token',
        ]
    )
    return profile, None


@sync_to_async
def create_quick_task(chat_id: int, title: str, description: str) -> Task:
    profile = (
        Profile.objects.select_related('user').filter(telegram_chat_id=chat_id).first()
    )

    if not profile:
        raise ValueError('Telegram-аккаунт не привязан.')

    default_status = (
        TaskStatus.objects.filter(is_default=True).order_by('order').first()
        or TaskStatus.objects.order_by('order').first()
    )
    return Task.objects.create(
        owner=profile.user,
        title=title,
        description=description,
        status=default_status,
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
            qs = qs.filter(status__is_archived=False)
        else:
            qs = qs.filter(status__key=status)

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
    default_status = (
        TaskStatus.objects.filter(is_default=True).order_by('order').first()
        or TaskStatus.objects.order_by('order').first()
    )
    return Task.objects.create(
        owner=profile.user,
        title=title,
        description=description,
        status=default_status,
    )
