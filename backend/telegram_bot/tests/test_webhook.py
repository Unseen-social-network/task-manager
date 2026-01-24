import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_help_command(monkeypatch):
    async def fake_dispatch(ctx):
        return None

    # 🔥 ВАЖНО: мокать dispatch ИМЕННО В views
    monkeypatch.setattr(
        'telegram_bot.views.dispatch',
        fake_dispatch,
    )

    client = APIClient()

    payload = {
        'message': {
            'chat': {'id': 123},
            'text': '/help',
            'from': {'username': 'tester'},
        }
    }

    response = client.post(
        '/api/telegram/webhook/',
        payload,
        format='json',
    )

    assert response.status_code == 200
