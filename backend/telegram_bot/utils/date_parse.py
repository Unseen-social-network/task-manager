"""Parse date strings for Telegram bot in project timezone."""

from datetime import datetime
import re
from zoneinfo import ZoneInfo

from django.conf import settings


def _parse_iso(value: str, tz: ZoneInfo) -> datetime | None:
    m = re.match(
        r'^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$',
        value,
    )
    if not m:
        return None
    try:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        h = int(m.group(4)) if m.group(4) else 0
        mi = int(m.group(5)) if m.group(5) else 0
        s = int(m.group(6)) if m.group(6) else 0
        dt = datetime(y, mo, d, h, mi, s, tzinfo=tz)
        return dt.astimezone(ZoneInfo('UTC'))
    except ValueError:
        return None


def _parse_dmY_hms(value: str, tz: ZoneInfo) -> datetime | None:
    m = re.match(
        r'^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$',
        value,
    )
    if not m:
        return None
    try:
        dt = datetime(
            int(m.group(3)),
            int(m.group(2)),
            int(m.group(1)),
            int(m.group(4)),
            int(m.group(5)),
            int(m.group(6)),
            tzinfo=tz,
        )
        return dt.astimezone(ZoneInfo('UTC'))
    except ValueError:
        return None


def _parse_dmY_hm(value: str, tz: ZoneInfo) -> datetime | None:
    m = re.match(
        r'^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{1,2})$',
        value,
    )
    if not m:
        return None
    try:
        dt = datetime(
            int(m.group(3)),
            int(m.group(2)),
            int(m.group(1)),
            int(m.group(4)),
            int(m.group(5)),
            0,
            tzinfo=tz,
        )
        return dt.astimezone(ZoneInfo('UTC'))
    except ValueError:
        return None


def _parse_dmY(value: str, tz: ZoneInfo) -> datetime | None:
    m = re.match(r'^(\d{1,2})\.(\d{1,2})\.(\d{4})$', value)
    if not m:
        return None
    try:
        dt = datetime(
            int(m.group(3)),
            int(m.group(2)),
            int(m.group(1)),
            0,
            0,
            0,
            tzinfo=tz,
        )
        return dt.astimezone(ZoneInfo('UTC'))
    except ValueError:
        return None


def parse_due_date(value: str | None) -> datetime | None:
    """
    Parse date string in project timezone.
    Supports: DD.MM.YYYY, DD.MM.YYYY HH:MM, DD.MM.YYYY HH:MM:SS,
    YYYY-MM-DD, YYYY-MM-DDTHH:MM, YYYY-MM-DDTHH:MM:SS (ISO without TZ).
    Returns timezone-aware datetime in UTC for storage, or None if invalid.
    """
    if value is None or not hasattr(value, 'strip'):
        return None
    value = value.strip()
    if not value:
        return None

    tz = ZoneInfo(settings.TIME_ZONE)
    for parser in (_parse_iso, _parse_dmY_hms, _parse_dmY_hm, _parse_dmY):
        result = parser(value, tz)
        if result is not None:
            return result
    return None
