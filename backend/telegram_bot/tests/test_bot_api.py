"""Tests for Telegram bot API endpoints."""

from django.contrib.auth import get_user_model
import pytest
from rest_framework import status
from rest_framework.test import APIClient

from planner.models import Task

User = get_user_model()

BOT_TOKEN = 'telegram-test-token'
BOT_HEADERS = {'HTTP_X_TELEGRAM_BOT_TOKEN': BOT_TOKEN}


def _link_profile(user, chat_id):
    profile = user.profile
    profile.telegram_chat_id = chat_id
    profile.telegram_notifications_enabled = True
    profile.telegram_notify_on_tag = True
    profile.save(
        update_fields=[
            'telegram_chat_id',
            'telegram_notifications_enabled',
            'telegram_notify_on_tag',
        ]
    )
    return profile


@pytest.mark.django_db
class TestTelegramBotAPI:
    """Telegram bot endpoints should respect auth and business rules."""

    def setup_method(self):
        self.client = APIClient()

    def test_quick_task_create_success(self, settings, task_statuses):
        settings.TELEGRAM_BOT_TOKEN = BOT_TOKEN
        user = User.objects.create_user(username='owner', password='pass123456')
        _link_profile(user, chat_id=101)

        response = self.client.post(
            '/api/v1/telegram/tasks/quick/',
            {'chat_id': 101, 'title': 'Быстрая задача', 'description': 'Описание'},
            format='json',
            **BOT_HEADERS,
        )

        assert response.status_code == status.HTTP_201_CREATED
        created = Task.objects.get(id=response.data['id'])
        assert created.owner == user
        assert created.title == 'Быстрая задача'

    def test_task_list_includes_owned_and_tagged(self, settings, task_statuses):
        settings.TELEGRAM_BOT_TOKEN = BOT_TOKEN
        settings.FRONTEND_BASE_URL = 'https://planner.example'
        owner = User.objects.create_user(username='owner', password='pass123456')
        tagger = User.objects.create_user(username='tagger', password='pass123456')
        _link_profile(owner, chat_id=202)

        status_map = {status.key: status for status in task_statuses}
        owned_task = Task.objects.create(
            owner=owner, title='Owned task', status=status_map['todo']
        )
        tagged_task = Task.objects.create(
            owner=tagger,
            title='Tagged task',
            tagged_user=owner,
            status=status_map['todo'],
        )
        Task.objects.create(owner=owner, title='Done task', status=status_map['done'])

        response = self.client.get(
            '/api/v1/telegram/tasks/',
            {'chat_id': 202, 'status': 'todo', 'limit': 5},
            format='json',
            **BOT_HEADERS,
        )

        assert response.status_code == status.HTTP_200_OK
        returned_ids = {item['id'] for item in response.data['results']}
        assert owned_task.id in returned_ids
        assert tagged_task.id in returned_ids
        assert response.data['task_url_template'].endswith('/tasks?task={id}')
        assert response.data['limit'] == 5

    def test_help_endpoint_returns_instructions(self, settings, task_statuses):
        settings.TELEGRAM_BOT_TOKEN = BOT_TOKEN
        settings.FRONTEND_BASE_URL = 'https://planner.example'
        user = User.objects.create_user(username='owner', password='pass123456')
        _link_profile(user, chat_id=303)

        response = self.client.get(
            '/api/v1/telegram/help/',
            {'chat_id': 303},
            format='json',
            **BOT_HEADERS,
        )

        assert response.status_code == status.HTTP_200_OK
        help_text = response.data['help']
        assert '/help' in help_text
        assert '/new' in help_text
        assert '/tasks' in help_text
        assert 'https://planner.example/tasks?task={id}' in help_text
