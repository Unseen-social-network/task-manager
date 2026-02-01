import mimetypes

import aiohttp
from django.conf import settings

BOT_TOKEN = settings.TELEGRAM_BACKUP_BOT_TOKEN
BASE_URL = f'https://api.telegram.org/bot{BOT_TOKEN}'
TIMEOUT = aiohttp.ClientTimeout(total=settings.TELEGRAM_BACKUP_TIMEOUT)


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


async def send_document(
    chat_id: int,
    file_path: str,
    caption: str | None = None,
    content_type: str | None = None,
    **kwargs,
) -> None:
    async with aiohttp.ClientSession(timeout=TIMEOUT) as session:
        form = aiohttp.FormData()
        form.add_field('chat_id', str(chat_id))
        if caption:
            form.add_field('caption', caption)
        for key, value in kwargs.items():
            form.add_field(key, str(value))
        if content_type is None:
            guessed_type, _ = mimetypes.guess_type(file_path)
            content_type = guessed_type or 'application/octet-stream'
        with open(file_path, 'rb') as handle:
            form.add_field(
                'document',
                handle,
                filename=file_path.split('/')[-1],
                content_type=content_type,
            )
            async with session.post(
                f'{BASE_URL}/sendDocument',
                data=form,
            ) as resp:
                resp.raise_for_status()
