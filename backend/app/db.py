from __future__ import annotations

import os
import sqlite3
import sys
from pathlib import Path
from typing import Iterator

DEFAULT_USER_ID = "user-local-default"


def resolve_data_dir() -> Path:
    configured_dir = os.getenv("ZHIKONG_DATA_DIR")
    if configured_dir:
        return Path(configured_dir).expanduser().resolve()
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent / "data"
    return Path(__file__).resolve().parents[1] / "data"


DB_PATH = resolve_data_dir() / "my_app.db"


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def get_db() -> Iterator[sqlite3.Connection]:
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()


def column_exists(conn: sqlite3.Connection, table: str, column: str) -> bool:
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return any(row["name"] == column for row in rows)


def table_exists(conn: sqlite3.Connection, table: str) -> bool:
    row = conn.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", (table,)).fetchone()
    return row is not None


def add_column_if_missing(conn: sqlite3.Connection, table: str, definition: str) -> None:
    column = definition.split()[0]
    if table_exists(conn, table) and not column_exists(conn, table, column):
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {definition}")


def init_db() -> None:
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              username TEXT NOT NULL,
              display_name TEXT NOT NULL DEFAULT '',
              status TEXT NOT NULL DEFAULT 'active',
              password_hash TEXT NOT NULL DEFAULT '',
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS devices (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              name TEXT NOT NULL,
              host TEXT NOT NULL,
              port INTEGER NOT NULL,
              pairing_token TEXT NOT NULL,
              system TEXT NOT NULL DEFAULT 'Unknown',
              type TEXT NOT NULL DEFAULT 'unknown',
              group_name TEXT NOT NULL DEFAULT '默认分组',
              note TEXT NOT NULL DEFAULT '',
              last_heartbeat_at TEXT,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS commands (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              device_id TEXT NOT NULL,
              action TEXT NOT NULL,
              payload TEXT NOT NULL,
              status TEXT NOT NULL,
              result TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY(user_id) REFERENCES users(id),
              FOREIGN KEY(device_id) REFERENCES devices(id)
            );

            CREATE TABLE IF NOT EXISTS device_logs (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              device_id TEXT NOT NULL,
              level TEXT NOT NULL,
              message TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY(user_id) REFERENCES users(id),
              FOREIGN KEY(device_id) REFERENCES devices(id)
            );

            CREATE TABLE IF NOT EXISTS api_configs (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL UNIQUE,
              backend_base_url TEXT NOT NULL DEFAULT 'http://127.0.0.1:8008',
              ai_base_url TEXT NOT NULL DEFAULT '',
              ai_api_key TEXT NOT NULL DEFAULT '',
              ai_model TEXT NOT NULL DEFAULT 'Command-7B',
              tencent_asr_app_id TEXT NOT NULL DEFAULT '',
              tencent_asr_secret_id TEXT NOT NULL DEFAULT '',
              tencent_asr_secret_key TEXT NOT NULL DEFAULT '',
              tencent_asr_engine TEXT NOT NULL DEFAULT '16k_zh',
              tencent_asr_enabled INTEGER NOT NULL DEFAULT 0,
              timeout_ms INTEGER NOT NULL DEFAULT 8000,
              max_retries INTEGER NOT NULL DEFAULT 2,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS user_sessions (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              device_name TEXT NOT NULL DEFAULT '',
              client_type TEXT NOT NULL DEFAULT '',
              last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY(user_id) REFERENCES users(id)
            );
            """
        )

        add_column_if_missing(conn, "devices", f"user_id TEXT NOT NULL DEFAULT '{DEFAULT_USER_ID}'")
        add_column_if_missing(conn, "devices", "last_heartbeat_at TEXT")
        add_column_if_missing(conn, "commands", f"user_id TEXT NOT NULL DEFAULT '{DEFAULT_USER_ID}'")
        add_column_if_missing(conn, "api_configs", "tencent_asr_app_id TEXT NOT NULL DEFAULT ''")
        add_column_if_missing(conn, "api_configs", "tencent_asr_secret_id TEXT NOT NULL DEFAULT ''")
        add_column_if_missing(conn, "api_configs", "tencent_asr_secret_key TEXT NOT NULL DEFAULT ''")
        add_column_if_missing(conn, "api_configs", "tencent_asr_engine TEXT NOT NULL DEFAULT '16k_zh'")
        add_column_if_missing(conn, "api_configs", "tencent_asr_enabled INTEGER NOT NULL DEFAULT 0")

        conn.execute(
            """
            INSERT OR IGNORE INTO users (id, username, display_name, status)
            VALUES (?, ?, ?, ?)
            """,
            (DEFAULT_USER_ID, "local-user", "本机用户", "active"),
        )
        conn.execute(
            """
            INSERT OR IGNORE INTO api_configs (id, user_id, backend_base_url, ai_model, timeout_ms, max_retries)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            ("cfg-local-default", DEFAULT_USER_ID, "http://127.0.0.1:8008", "Command-7B", 8000, 2),
        )
        conn.execute("UPDATE devices SET user_id = ? WHERE user_id IS NULL OR user_id = ''", (DEFAULT_USER_ID,))
        conn.execute("UPDATE commands SET user_id = ? WHERE user_id IS NULL OR user_id = ''", (DEFAULT_USER_ID,))
        conn.executescript(
            """
            CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
            CREATE INDEX IF NOT EXISTS idx_devices_user_status ON devices(user_id, system, type);
            CREATE INDEX IF NOT EXISTS idx_commands_user_id ON commands(user_id);
            CREATE INDEX IF NOT EXISTS idx_commands_user_created_at ON commands(user_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_device_logs_user_device ON device_logs(user_id, device_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_nocase ON users(lower(username));
            """
        )
        conn.commit()
