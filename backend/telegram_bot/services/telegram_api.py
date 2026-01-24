import aiohttp
from django.conf import settings

BOT_TOKEN = settings.TELEGRAM_BOT_TOKEN
BASE_URL = f'https://api.telegram.org/bot{BOT_TOKEN}'
TIMEOUT = aiohttp.ClientTimeout(total=5)


async def _post(method: str, payload: dict) -> None:
    async with aiohttp.ClientSession(timeout=TIMEOUT) as session:
        async with session.post(
            f'{BASE_URL}/{method}',
            json=payload,
        ) as resp:
            resp.raise_for_status()


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
