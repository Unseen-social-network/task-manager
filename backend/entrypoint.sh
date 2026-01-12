#!/usr/bin/env bash
set -e

if [ -n "$DATABASE_URL" ]; then
  python - <<'PY'
import os
import time
import psycopg

url = os.environ.get("DATABASE_URL")
for _ in range(30):
    try:
        conn = psycopg.connect(url)
        conn.close()
        break
    except Exception:
        time.sleep(1)
else:
    raise SystemExit("Database not available")
PY
fi

exec "$@"
