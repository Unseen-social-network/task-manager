"""Tests for Telegram tag notifications."""

from unittest.mock import patch

import pytest
from rest_framework import status

from planner.models import Task


@pytest.mark.django_db
class TestTelegramTagNotifications:
    """Ensure tagging notifications include actor and task links."""

    def test_notification_includes_owner_and_link_on_create(
        self, settings, user, other_user, task_statuses
    ):
        settings.FRONTEND_BASE_URL = 'https://planner.example'
        default_status = next(status for status in task_statuses if status.key == 'todo')
        profile = user.profile
        profile.telegram_chat_id = 9001
        profile.telegram_notifications_enabled = True
        profile.telegram_notify_on_tag = True
        profile.save(
            update_fields=[
                'telegram_chat_id',
                'telegram_notifications_enabled',
                'telegram_notify_on_tag',
            ]
        )

        with patch('planner.signals.send_telegram_message') as mock_send:
            task = Task.objects.create(
                owner=other_user,
                title='Tagged task',
                tagged_user=user,
                status=default_status,
            )

        assert mock_send.call_count == 1
        sent_chat_id, message = mock_send.call_args.args
        assert sent_chat_id == 9001
        assert other_user.username in message
        assert f'https://planner.example/tasks?task={task.id}' in message

    def test_notification_uses_request_user_on_update(
        self, settings, authenticated_client, user, other_user, task_statuses
    ):
        settings.FRONTEND_BASE_URL = 'https://planner.example'
        default_status = next(status for status in task_statuses if status.key == 'todo')
        profile = other_user.profile
        profile.telegram_chat_id = 1337
        profile.telegram_notifications_enabled = True
        profile.telegram_notify_on_tag = True
        profile.save(
            update_fields=[
                'telegram_chat_id',
                'telegram_notifications_enabled',
                'telegram_notify_on_tag',
            ]
        )
        task = Task.objects.create(owner=user, title='Needs tagging', status=default_status)
        url = f'/api/v1/tasks/{task.id}/'

        with patch('planner.signals.send_telegram_message') as mock_send:
            response = authenticated_client.patch(
                url,
                {'tagged_user': other_user.username},
            )

        assert response.status_code == status.HTTP_200_OK
        sent_chat_id, message = mock_send.call_args.args
        assert sent_chat_id == 1337
        assert user.username in message
        assert f'https://planner.example/tasks?task={task.id}' in message
