from __future__ import annotations

import asyncio
from collections.abc import Callable
import logging
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from django.conf import settings

from telegram_bot.services.backup import send_backup


def _run_backup_job() -> None:
    asyncio.run(send_backup())


def _build_trigger() -> CronTrigger:
    timezone = ZoneInfo(settings.TIME_ZONE)
    return CronTrigger.from_crontab(settings.TELEGRAM_BACKUP_CRON, timezone=timezone)


def _schedule_job(scheduler: BackgroundScheduler, job: Callable[[], None]) -> None:
    trigger = _build_trigger()
    scheduler.add_job(
        job,
        trigger,
        id='telegram_backup',
        replace_existing=True,
    )


def start_backup_scheduler() -> BackgroundScheduler | None:
    if not settings.TELEGRAM_BACKUP_ENABLED:
        logging.info('Telegram backups are disabled; scheduler will not start.')
        return None
    scheduler = BackgroundScheduler(timezone=ZoneInfo(settings.TIME_ZONE))
    _schedule_job(scheduler, _run_backup_job)
    scheduler.start()
    logging.info(
        'Backup scheduler started with cron: %s', settings.TELEGRAM_BACKUP_CRON
    )
    return scheduler
