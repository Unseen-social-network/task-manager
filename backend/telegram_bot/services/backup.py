from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime
import logging
import os
import shutil
import subprocess
import tempfile
from zoneinfo import ZoneInfo

import aiohttp
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


def _clickhouse_telegram_backup_eligible() -> bool:
    if not settings.CLICKHOUSE_HOST.strip():
        return False
    if not os.path.isdir(settings.CLICKHOUSE_BACKUPS_READER_DIR):
        logging.warning(
            'ClickHouse backup skipped: directory %s missing '
            '(mount clickhouse_data on backend in compose).',
            settings.CLICKHOUSE_BACKUPS_READER_DIR,
        )
        return False
    return True


async def _clickhouse_http_backup(server_side_filename: str) -> None:
    host = settings.CLICKHOUSE_HOST.strip()
    port = settings.CLICKHOUSE_HTTP_PORT
    url = f'http://{host}:{port}/'
    server_path = f'/var/lib/clickhouse/backups/{server_side_filename}'
    query = f"BACKUP ALL EXCEPT DATABASES system TO File('{server_path}')"
    timeout = aiohttp.ClientTimeout(total=600)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.post(url, data=query.encode('utf-8')) as resp:
            body = await resp.text()
            if resp.status != 200:
                raise RuntimeError(f'ClickHouse HTTP {resp.status}: {body[:800]}')
            if 'DB::Exception' in body or '\tCode: ' in body:
                raise RuntimeError(f'ClickHouse query failed: {body[:1200]}')


async def _wait_clickhouse_backup_file(
    reader_path: str,
    timeout_sec: float = 300.0,
) -> None:
    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout_sec
    while loop.time() < deadline:
        if os.path.isfile(reader_path) and os.path.getsize(reader_path) > 0:
            return
        await asyncio.sleep(0.5)
    raise TimeoutError(f'Timeout waiting for ClickHouse backup file: {reader_path}')


def _build_clickhouse_caption(stats: BackupStats | None) -> str:
    timezone = ZoneInfo(settings.TIME_ZONE)
    timestamp = datetime.now(timezone).strftime('%Y-%m-%d %H:%M:%S %Z')
    lines = [f'ClickHouse native backup at {timestamp}.']
    if stats is not None:
        lines.append('')
        lines.append('Server stats (same as Postgres backup):')
        lines.extend(stats.format_lines())
    return '\n'.join(lines)


async def send_backup() -> None:
    if not settings.TELEGRAM_BACKUP_ENABLED:
        return
    if not settings.TELEGRAM_BACKUP_BOT_TOKEN:
        raise ValueError('TELEGRAM_BACKUP_BOT_TOKEN is required for backups.')
    if not settings.TELEGRAM_BACKUP_USER_ID:
        raise ValueError('TELEGRAM_BACKUP_USER_ID is required for backups.')

    stats = _collect_stats() if settings.TELEGRAM_BACKUP_WITH_STATS else None
    caption_pg = _build_caption(stats)

    timezone = ZoneInfo(settings.TIME_ZONE)
    ch_ts = datetime.now(timezone).strftime('%Y%m%d_%H%M%S')
    ch_filename = f'planner_ch_{ch_ts}.zip'
    ch_reader_path = os.path.join(
        settings.CLICKHOUSE_BACKUPS_READER_DIR,
        ch_filename,
    )
    ch_send_path: str | None = None

    with tempfile.TemporaryDirectory() as temp_dir:
        archive_path = create_backup_archive(temp_dir)

        if _clickhouse_telegram_backup_eligible():
            try:
                await _clickhouse_http_backup(ch_filename)
                await _wait_clickhouse_backup_file(ch_reader_path)
                ch_send_path = ch_reader_path
            except Exception:
                logging.exception(
                    'ClickHouse backup failed; sending Postgres dump only.'
                )

        await send_document(
            settings.TELEGRAM_BACKUP_USER_ID,
            archive_path,
            caption=caption_pg,
        )

        if ch_send_path and os.path.isfile(ch_send_path):
            caption_ch = _build_clickhouse_caption(stats)
            try:
                await send_document(
                    settings.TELEGRAM_BACKUP_USER_ID,
                    ch_send_path,
                    caption=caption_ch,
                )
            finally:
                try:
                    os.remove(ch_send_path)
                except OSError:
                    logging.warning(
                        'Could not remove ClickHouse backup file %s',
                        ch_send_path,
                    )

    if stats is not None and settings.TELEGRAM_BACKUP_SEND_STATS_MESSAGE:
        try:
            await send_message(
                settings.TELEGRAM_BACKUP_USER_ID,
                _build_text_summary(stats),
            )
        except Exception:
            logging.exception('Failed to send backup stats message to Telegram.')
