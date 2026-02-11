"""
Signals for Planner application.
"""

from asgiref.sync import async_to_sync
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models.signals import m2m_changed, post_save, pre_save
from django.dispatch import receiver

from telegram_bot.services import send_telegram_message

from .models import Profile, Task

User = get_user_model()


def _notify_tagged_user_telegram(task, user, tagger):
    try:
        profile = user.profile
    except Profile.DoesNotExist:
        return
    if not profile.telegram_chat_id:
        return
    if not profile.telegram_notifications_enabled or not profile.telegram_notify_on_tag:
        return
    tagger_name = tagger.get_full_name() or tagger.username
    task_url = _build_task_url(task.id)
    message_lines = [
        f'👤 {tagger_name} отметил(а) вас в задаче: {task.title}',
    ]
    if task_url:
        message_lines.append(f'🔗 {task_url}')
    message = '\n'.join(message_lines)
    async_to_sync(send_telegram_message)(profile.telegram_chat_id, message)


def _build_task_url(task_id):
    base_url = getattr(settings, 'FRONTEND_BASE_URL', '').rstrip('/')
    if not base_url:
        return ''
    return f'{base_url}/tasks?task={task_id}'


@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)


@receiver(pre_save, sender=Task)
def track_task_tag_change(sender, instance, **kwargs):
    if instance.pk:
        instance._previous_tagged_user_id = (
            Task.objects.filter(pk=instance.pk)
            .values_list('tagged_user_id', flat=True)
            .first()
        )
    else:
        instance._previous_tagged_user_id = None


@receiver(post_save, sender=Task)
def notify_tagged_user(sender, instance, created, **kwargs):
    tagged_user_id = instance.tagged_user_id
    if not tagged_user_id:
        return
    previous_tagged_user_id = getattr(instance, '_previous_tagged_user_id', None)
    if not created and previous_tagged_user_id == tagged_user_id:
        return
    tagger = getattr(instance, '_tagged_by', None) or instance.owner
    _notify_tagged_user_telegram(instance, instance.tagged_user, tagger)


@receiver(m2m_changed, sender=Task.tagged_users.through)
def notify_tagged_users_m2m(sender, instance, action, pk_set, **kwargs):
    if action != 'post_add' or not pk_set:
        return
    tagger = getattr(instance, '_tagged_by', None) or instance.owner
    for user in User.objects.filter(pk__in=pk_set):
        _notify_tagged_user_telegram(instance, user, tagger)
