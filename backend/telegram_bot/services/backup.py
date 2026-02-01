from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
import os
import shutil
import subprocess
import tempfile
from zoneinfo import ZoneInfo

from django.conf import settings

from telegram_bot.services.backup_bot_api import send_document, send_message


@dataclass(frozen=True)
class BackupStats:
    free_bytes: int
    total_bytes: int
    used_bytes: int
    load_average: tuple[float, float, float] | None
    memory_total_bytes: int | None
    memory_available_bytes: int | None
    uptime_seconds: float | None

    def format_lines(self) -> list[str]:
        free_gb = self.free_bytes / (1024**3)
        total_gb = self.total_bytes / (1024**3)
        used_gb = self.used_bytes / (1024**3)
        lines = [
            f'VM disk free: {free_gb:.2f} GB',
            f'VM disk used: {used_gb:.2f} GB',
            f'VM disk total: {total_gb:.2f} GB',
        ]
        if self.load_average:
            load_1, load_5, load_15 = self.load_average
            lines.append(
                f'Load average (1/5/15m): {load_1:.2f}, {load_5:.2f}, {load_15:.2f}'
            )
        if (
            self.memory_total_bytes is not None
            and self.memory_available_bytes is not None
        ):
            memory_total_gb = self.memory_total_bytes / (1024**3)
            memory_available_gb = self.memory_available_bytes / (1024**3)
            lines.append(
                f'Memory available: {memory_available_gb:.2f} GB / {memory_total_gb:.2f} GB'
            )
        if self.uptime_seconds is not None:
            uptime_hours = self.uptime_seconds / 3600
            lines.append(f'VM uptime: {uptime_hours:.2f} hours')
        return lines


def _parse_database_url() -> dict[str, str]:
    database = settings.DATABASES.get('default', {})
    if database.get('ENGINE') != 'django.db.backends.postgresql':
        raise ValueError('Database engine must be PostgreSQL for pg_dump backups.')
    return {
        'name': database.get('NAME') or '',
        'user': database.get('USER') or '',
        'password': database.get('PASSWORD') or '',
        'host': database.get('HOST') or 'localhost',
        'port': str(database.get('PORT') or '5432'),
    }


def _read_meminfo() -> tuple[int | None, int | None]:
    try:
        with open('/proc/meminfo', encoding='utf-8') as handle:
            content = handle.read().splitlines()
    except OSError:
        return None, None
    mem_total = None
    mem_available = None
    for line in content:
        if line.startswith('MemTotal:'):
            mem_total = int(line.split()[1]) * 1024
        elif line.startswith('MemAvailable:'):
            mem_available = int(line.split()[1]) * 1024
    return mem_total, mem_available


def _read_uptime() -> float | None:
    try:
        with open('/proc/uptime', encoding='utf-8') as handle:
            return float(handle.read().split()[0])
    except OSError:
        return None


def _collect_stats() -> BackupStats:
    usage = shutil.disk_usage('/')
    load_average = os.getloadavg() if hasattr(os, 'getloadavg') else None
    mem_total, mem_available = _read_meminfo()
    uptime_seconds = _read_uptime()
    return BackupStats(
        free_bytes=usage.free,
        total_bytes=usage.total,
        used_bytes=usage.used,
        load_average=load_average,
        memory_total_bytes=mem_total,
        memory_available_bytes=mem_available,
        uptime_seconds=uptime_seconds,
    )


def _build_caption(stats: BackupStats | None) -> str:
    timezone = ZoneInfo(settings.TIME_ZONE)
    timestamp = datetime.now(timezone).strftime('%Y-%m-%d %H:%M:%S %Z')
    lines = [f'Database backup generated at {timestamp}.']
    if stats is not None:
        lines.append('')
        lines.append('Backup stats:')
        lines.extend(stats.format_lines())
    return '\n'.join(lines)


def _build_text_summary(stats: BackupStats | None) -> str:
    timezone = ZoneInfo(settings.TIME_ZONE)
    timestamp = datetime.now(timezone).strftime('%Y-%m-%d %H:%M:%S %Z')
    lines = [f'Database backup sent at {timestamp}.']
    if stats is not None:
        lines.append('')
        lines.append('Backup stats:')
        lines.extend(stats.format_lines())
    return '\n'.join(lines)


def create_backup_archive(output_dir: str) -> str:
    db = _parse_database_url()
    timezone = ZoneInfo(settings.TIME_ZONE)
    timestamp = datetime.now(timezone).strftime('%Y%m%d_%H%M%S')
    dump_path = os.path.join(output_dir, f'planner_{timestamp}.dump')

    env = os.environ.copy()
    if db['password']:
        env['PGPASSWORD'] = db['password']

    with open(dump_path, 'wb') as handle:
        process = subprocess.run(
            [
                'pg_dump',
                '--format=custom',
                '--compress=9',
                '--no-owner',
                '--no-privileges',
                f'--host={db["host"]}',
                f'--port={db["port"]}',
                f'--username={db["user"]}',
                db['name'],
            ],
            check=True,
            env=env,
            stdout=handle,
        )
    if process.returncode != 0:
        raise RuntimeError('pg_dump failed')

    return dump_path


async def send_backup() -> None:
    if not settings.TELEGRAM_BACKUP_ENABLED:
        return
    if not settings.TELEGRAM_BACKUP_BOT_TOKEN:
        raise ValueError('TELEGRAM_BACKUP_BOT_TOKEN is required for backups.')
    if not settings.TELEGRAM_BACKUP_USER_ID:
        raise ValueError('TELEGRAM_BACKUP_USER_ID is required for backups.')

    stats = _collect_stats() if settings.TELEGRAM_BACKUP_WITH_STATS else None
    caption = _build_caption(stats)

    with tempfile.TemporaryDirectory() as temp_dir:
        archive_path = create_backup_archive(temp_dir)
        await send_document(
            settings.TELEGRAM_BACKUP_USER_ID,
            archive_path,
            caption=caption,
        )

    if stats is not None:
        await send_message(settings.TELEGRAM_BACKUP_USER_ID, _build_text_summary(stats))
