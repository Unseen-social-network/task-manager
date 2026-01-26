import asyncio

from django.core.management.base import BaseCommand

from telegram_bot.services.backup import send_backup


class Command(BaseCommand):
    help = 'Generate a database dump and send it via the backup Telegram bot.'

    def handle(self, *args, **options):
        asyncio.run(send_backup())
