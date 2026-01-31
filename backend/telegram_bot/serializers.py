"""Serializers for Telegram bot integration."""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from planner.models import Task, TaskStatus

User = get_user_model()


def _get_status_choices():
    statuses = TaskStatus.objects.order_by('order', 'label').values_list('key', 'label')
    choices = list(statuses)
    if choices:
        return choices
    return [
        ('todo', 'To Do'),
        ('in_progress', 'In Progress'),
        ('done', 'Done'),
        ('canceled', 'Canceled'),
    ]


class _StatusChoicesMixin:
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if 'status' in self.fields:
            self.fields['status'].choices = _get_status_choices()


class TelegramLinkConfirmSerializer(serializers.Serializer):
    """Serializer for Telegram link confirmation from bot."""

    link_token = serializers.UUIDField()
    chat_id = serializers.IntegerField(min_value=1)
    telegram_username = serializers.CharField(required=False, allow_blank=True)


class TelegramQuickTaskSerializer(serializers.Serializer):
    """Serializer for quick task creation via Telegram bot."""

    chat_id = serializers.IntegerField(min_value=1)
    title = serializers.CharField(max_length=500)
    description = serializers.CharField(required=False, allow_blank=True)


class TelegramQuickTaskResponseSerializer(serializers.Serializer):
    """Serializer for quick task creation responses."""

    id = serializers.IntegerField()
    title = serializers.CharField(max_length=500)
    description = serializers.CharField(required=False, allow_blank=True)


class TelegramFullTaskSerializer(_StatusChoicesMixin, serializers.Serializer):
    """Serializer for full task creation via Telegram bot."""

    chat_id = serializers.IntegerField(min_value=1)
    title = serializers.CharField(max_length=500)
    description = serializers.CharField(required=False, allow_blank=True)
    urgency = serializers.ChoiceField(choices=Task.Urgency.choices, required=False)
    due_date = serializers.DateTimeField(required=False, allow_null=True)
    status = serializers.ChoiceField(choices=(), required=False)
    contact_id = serializers.IntegerField(required=False)
    contact_freeform = serializers.CharField(required=False, allow_blank=True)
    project_id = serializers.IntegerField(required=False)
    tagged_username = serializers.CharField(required=False, allow_blank=True)


class TelegramNotificationsSerializer(serializers.Serializer):
    """Serializer for Telegram notification settings via bot."""

    chat_id = serializers.IntegerField(min_value=1)
    notifications_enabled = serializers.BooleanField(required=False)
    notify_on_tag = serializers.BooleanField(required=False)


class TelegramTaskListSerializer(_StatusChoicesMixin, serializers.Serializer):
    """Serializer for listing tasks via Telegram bot."""

    chat_id = serializers.IntegerField(min_value=1)
    status = serializers.ChoiceField(choices=(), required=False)
    limit = serializers.IntegerField(
        min_value=1,
        max_value=50,
        required=False,
        default=10,
    )


class TelegramTaskListItemSerializer(serializers.Serializer):
    """Serializer for a task list item in Telegram responses."""

    id = serializers.IntegerField()
    title = serializers.CharField(max_length=500)
    status = serializers.CharField()


class TelegramTaskListResponseSerializer(serializers.Serializer):
    """Serializer for task list responses via Telegram bot."""

    results = TelegramTaskListItemSerializer(many=True)
    count = serializers.IntegerField()
    limit = serializers.IntegerField()
    task_url_template = serializers.CharField()


class TelegramHelpSerializer(serializers.Serializer):
    """Serializer for Telegram help command."""

    chat_id = serializers.IntegerField(min_value=1)


class TelegramHelpResponseSerializer(serializers.Serializer):
    """Serializer for Telegram help responses."""

    help = serializers.CharField()
    task_url_template = serializers.CharField()


class TelegramPasswordResetSerializer(serializers.Serializer):
    """Serializer for password reset via Telegram bot."""

    chat_id = serializers.IntegerField(min_value=1)
    new_password = serializers.CharField()

    def validate_new_password(self, value):
        validate_password(value)
        return value


class TelegramLoginSerializer(serializers.Serializer):
    """Serializer for Telegram login via bot."""

    chat_id = serializers.IntegerField(min_value=1)


class TelegramWebhookSerializer(serializers.Serializer):
    """Serializer for Telegram webhook payloads."""
