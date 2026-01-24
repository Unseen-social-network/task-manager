import asyncio
import json
from urllib import request

from django.conf import settings

BOT_TOKEN = settings.TELEGRAM_BOT_TOKEN
BASE_URL = f'https://api.telegram.org/bot{BOT_TOKEN}'
TIMEOUT_SECONDS = 5


def _sync_post(method: str, payload: dict) -> None:
    data = json.dumps(payload).encode('utf-8')
    req = request.Request(
        f'{BASE_URL}/{method}',
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    with request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
        if resp.status >= 400:
            raise RuntimeError(f'Telegram API error: {resp.status}')
        resp.read()


async def _post(method: str, payload: dict) -> None:
    await asyncio.to_thread(_sync_post, method, payload)


async def send_message(chat_id: int, text: str, **kwargs) -> None:
    payload = {
        'chat_id': chat_id,
        'text': text,
        **kwargs,
    }
    await _post('sendMessage', payload)


async def edit_message(
    chat_id: int,
    message_id: int,
    text: str,
    **kwargs,
) -> None:
    payload = {
        'chat_id': chat_id,
        'message_id': message_id,
        'text': text,
        **kwargs,
    }
    await _post('editMessageText', payload)
