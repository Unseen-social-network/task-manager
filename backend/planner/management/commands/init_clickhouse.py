"""Django management command: создать таблицы ClickHouse для аналитики."""

from __future__ import annotations

from django.core.management.base import BaseCommand

from planner.clickhouse_client import ensure_user_events_table


class Command(BaseCommand):
    help = 'Создать таблицы ClickHouse для аналитики (user_events)'

    def handle(self, *args, **options) -> None:
        try:
            ensure_user_events_table()
            self.stdout.write(
                self.style.SUCCESS(
                    '✓ Таблица user_events создана (или уже существует).'
                )
            )
        except RuntimeError as exc:
            self.stdout.write(self.style.ERROR(f'✗ {exc}'))
