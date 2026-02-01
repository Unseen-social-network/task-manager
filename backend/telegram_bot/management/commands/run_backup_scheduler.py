import time

from django.core.management.base import BaseCommand

from telegram_bot.services.backup_scheduler import start_backup_scheduler


class Command(BaseCommand):
    help = 'Start the Telegram backup scheduler using TELEGRAM_BACKUP_CRON.'

    def handle(self, *args, **options):
        scheduler = start_backup_scheduler()
        if scheduler is None:
            self.stdout.write(
                self.style.WARNING('Backup scheduler disabled via TELEGRAM_BACKUP_ENABLED.')
            )
            return

        self.stdout.write(
            self.style.SUCCESS('Backup scheduler started. Press Ctrl+C to stop.')
        )
        try:
            while True:
                time.sleep(60)
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING('Stopping backup scheduler...'))
            scheduler.shutdown()
