"""Serializers for Telegram bot integration."""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from planner.models import Task

User = get_user_model()


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


class TelegramFullTaskSerializer(serializers.Serializer):
    """Serializer for full task creation via Telegram bot."""

    chat_id = serializers.IntegerField(min_value=1)
    title = serializers.CharField(max_length=500)
    description = serializers.CharField(required=False, allow_blank=True)
    urgency = serializers.ChoiceField(choices=Task.Urgency.choices, required=False)
    due_date = serializers.DateTimeField(required=False, allow_null=True)
    status = serializers.ChoiceField(choices=Task.Status.choices, required=False)
    contact_id = serializers.IntegerField(required=False)
    contact_freeform = serializers.CharField(required=False, allow_blank=True)
    project_id = serializers.IntegerField(required=False)
    tagged_username = serializers.CharField(required=False, allow_blank=True)


class TelegramNotificationsSerializer(serializers.Serializer):
    """Serializer for Telegram notification settings via bot."""

    chat_id = serializers.IntegerField(min_value=1)
    notifications_enabled = serializers.BooleanField(required=False)
    notify_on_tag = serializers.BooleanField(required=False)


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
