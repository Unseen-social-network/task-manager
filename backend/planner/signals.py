"""
Signals for Planner application.
"""

from django.contrib.auth import get_user_model
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from telegram_bot.services import send_telegram_message

from .models import Profile, Task

User = get_user_model()


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
    try:
        profile = instance.tagged_user.profile
    except Profile.DoesNotExist:
        return
    if not profile.telegram_chat_id:
        return
    if not profile.telegram_notifications_enabled or not profile.telegram_notify_on_tag:
        return
    message = f'Вас отметили в задаче: {instance.title}'
    send_telegram_message(profile.telegram_chat_id, message)
