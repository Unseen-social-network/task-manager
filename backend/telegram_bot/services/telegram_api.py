import aiohttp
from django.conf import settings

BOT_TOKEN = settings.TELEGRAM_BOT_TOKEN
BASE_URL = f'https://api.telegram.org/bot{BOT_TOKEN}'


async def send_message(chat_id: int, text: str) -> None:
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f'{BASE_URL}/sendMessage',
            json={'chat_id': chat_id, 'text': text},
            timeout=aiohttp.ClientTimeout(total=5),
        ) as resp:
            resp.raise_for_status()
