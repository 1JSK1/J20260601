from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone

from .passwords import hash_password, verify_password
from .schemas import (
    ApiConfigOut,
    AuthLoginRequest,
    AuthRegisterRequest,
    CommandOut,
    DeviceCreate,
    DeviceLogOut,
    DeviceOut,
    DeviceUpdate,
    TencentAsrConfigOut,
    TencentAsrConfigUpdate,
    UserOut,
)


def row_to_device(row: sqlite3.Row) -> DeviceOut:
    return DeviceOut(**dict(row))


def row_to_command(row: sqlite3.Row) -> CommandOut:
    return CommandOut(**dict(row))


def row_to_user(row: sqlite3.Row) -> UserOut:
    return UserOut(**dict(row))


def row_to_api_config(row: sqlite3.Row) -> ApiConfigOut:
    return ApiConfigOut(**dict(row))


def row_to_device_log(row: sqlite3.Row) -> DeviceLogOut:
    return DeviceLogOut(**dict(row))


def ensure_user(conn: sqlite3.Connection, user_id: str) -> UserOut:
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if row:
        return row_to_user(row)

    conn.execute(
        """
        INSERT INTO users (id, username, display_name, status)
        VALUES (?, ?, ?, ?)
        """,
        (user_id, user_id, user_id, "active"),
    )
    conn.execute(
        """
        INSERT OR IGNORE INTO api_configs (id, user_id)
        VALUES (?, ?)
        """,
        (f"cfg-{uuid.uuid4().hex[:12]}", user_id),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return row_to_user(row)


def get_user_by_username(conn: sqlite3.Connection, username: str) -> UserOut | None:
    row = conn.execute("SELECT * FROM users WHERE lower(username) = lower(?)", (username.strip(),)).fetchone()
    return row_to_user(row) if row else None


def register_user(conn: sqlite3.Connection, payload: AuthRegisterRequest) -> UserOut:
    username = payload.username.strip()
    if get_user_by_username(conn, username):
        raise ValueError("用户名已存在")

    user_id = f"user-{uuid.uuid4().hex[:12]}"
    display_name = payload.display_name.strip() or username
    try:
        conn.execute(
            """
            INSERT INTO users (id, username, display_name, status, password_hash)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, username, display_name, "active", hash_password(payload.password)),
        )
    except sqlite3.IntegrityError as exc:
        raise ValueError("用户名已存在") from exc
    conn.execute(
        """
        INSERT OR IGNORE INTO api_configs (id, user_id)
        VALUES (?, ?)
        """,
        (f"cfg-{uuid.uuid4().hex[:12]}", user_id),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return row_to_user(row)


def authenticate_user(conn: sqlite3.Connection, payload: AuthLoginRequest) -> UserOut | None:
    row = conn.execute("SELECT * FROM users WHERE lower(username) = lower(?)", (payload.username.strip(),)).fetchone()
    if not row:
        return None
    password_hash = row["password_hash"] if "password_hash" in row.keys() else ""
    if not password_hash or not verify_password(payload.password, password_hash):
        return None
    return row_to_user(row)


def create_session(conn: sqlite3.Connection, user_id: str, device_name: str = "Web App", client_type: str = "web") -> str:
    session_id = f"sess-{uuid.uuid4().hex}{uuid.uuid4().hex[:8]}"
    conn.execute(
        """
        INSERT INTO user_sessions (id, user_id, device_name, client_type)
        VALUES (?, ?, ?, ?)
        """,
        (session_id, user_id, device_name, client_type),
    )
    conn.commit()
    return session_id


def delete_session(conn: sqlite3.Connection, user_id: str, session_id: str) -> bool:
    result = conn.execute("DELETE FROM user_sessions WHERE id = ? AND user_id = ?", (session_id, user_id))
    conn.commit()
    return result.rowcount > 0


def get_api_config(conn: sqlite3.Connection, user_id: str) -> ApiConfigOut:
    ensure_user(conn, user_id)
    row = conn.execute("SELECT * FROM api_configs WHERE user_id = ?", (user_id,)).fetchone()
    if row:
        return row_to_api_config(row)

    config_id = f"cfg-{uuid.uuid4().hex[:12]}"
    conn.execute("INSERT INTO api_configs (id, user_id) VALUES (?, ?)", (config_id, user_id))
    conn.commit()
    row = conn.execute("SELECT * FROM api_configs WHERE id = ?", (config_id,)).fetchone()
    return row_to_api_config(row)


def update_api_config(conn: sqlite3.Connection, user_id: str, backend_base_url: str) -> ApiConfigOut:
    get_api_config(conn, user_id)
    conn.execute(
        """
        UPDATE api_configs
        SET backend_base_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
        """,
        (backend_base_url, user_id),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM api_configs WHERE user_id = ?", (user_id,)).fetchone()
    return row_to_api_config(row)


def get_tencent_asr_config(conn: sqlite3.Connection, user_id: str) -> TencentAsrConfigOut:
    get_api_config(conn, user_id)
    row = conn.execute(
        """
        SELECT tencent_asr_app_id, tencent_asr_secret_id, tencent_asr_secret_key,
               tencent_asr_engine, tencent_asr_enabled, updated_at
        FROM api_configs
        WHERE user_id = ?
        """,
        (user_id,),
    ).fetchone()
    if not row:
        raise RuntimeError("Failed to load Tencent ASR config")

    app_id = str(row["tencent_asr_app_id"])
    secret_id = str(row["tencent_asr_secret_id"])
    secret_key_configured = bool(row["tencent_asr_secret_key"])
    return TencentAsrConfigOut(
        app_id=app_id,
        secret_id=secret_id,
        secret_key_configured=secret_key_configured,
        engine=str(row["tencent_asr_engine"]),
        enabled=bool(row["tencent_asr_enabled"]),
        configured=bool(app_id and secret_id and secret_key_configured),
        updated_at=str(row["updated_at"]),
    )


def update_tencent_asr_config(
    conn: sqlite3.Connection,
    user_id: str,
    payload: TencentAsrConfigUpdate,
) -> TencentAsrConfigOut:
    get_api_config(conn, user_id)
    current = conn.execute(
        "SELECT tencent_asr_secret_key FROM api_configs WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    secret_key = payload.secret_key.strip() or str(current["tencent_asr_secret_key"])
    if payload.enabled and not secret_key:
        raise ValueError("启用腾讯云语音识别时必须填写 SecretKey")

    conn.execute(
        """
        UPDATE api_configs
        SET tencent_asr_app_id = ?,
            tencent_asr_secret_id = ?,
            tencent_asr_secret_key = ?,
            tencent_asr_engine = ?,
            tencent_asr_enabled = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
        """,
        (
            payload.app_id.strip(),
            payload.secret_id.strip(),
            secret_key,
            payload.engine,
            1 if payload.enabled else 0,
            user_id,
        ),
    )
    conn.commit()
    return get_tencent_asr_config(conn, user_id)


def get_tencent_asr_credentials(conn: sqlite3.Connection, user_id: str) -> dict[str, str]:
    get_api_config(conn, user_id)
    row = conn.execute(
        """
        SELECT tencent_asr_app_id, tencent_asr_secret_id, tencent_asr_secret_key,
               tencent_asr_engine, tencent_asr_enabled
        FROM api_configs
        WHERE user_id = ?
        """,
        (user_id,),
    ).fetchone()
    if not row or not bool(row["tencent_asr_enabled"]):
        raise ValueError("腾讯云实时语音识别尚未启用")

    result = {
        "app_id": str(row["tencent_asr_app_id"]),
        "secret_id": str(row["tencent_asr_secret_id"]),
        "secret_key": str(row["tencent_asr_secret_key"]),
        "engine": str(row["tencent_asr_engine"]),
    }
    if not all(result.values()):
        raise ValueError("腾讯云实时语音识别配置不完整")
    return result


def list_devices(conn: sqlite3.Connection, user_id: str) -> list[DeviceOut]:
    ensure_user(conn, user_id)
    rows = conn.execute("SELECT * FROM devices WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall()
    return [row_to_device(row) for row in rows]


def get_device(conn: sqlite3.Connection, user_id: str, device_id: str) -> DeviceOut | None:
    ensure_user(conn, user_id)
    row = conn.execute("SELECT * FROM devices WHERE id = ? AND user_id = ?", (device_id, user_id)).fetchone()
    return row_to_device(row) if row else None


def create_device(conn: sqlite3.Connection, user_id: str, payload: DeviceCreate) -> DeviceOut:
    ensure_user(conn, user_id)
    device_id = f"dev-{uuid.uuid4().hex[:12]}"
    conn.execute(
        """
        INSERT INTO devices (id, user_id, name, host, port, pairing_token, system, type, group_name, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            device_id,
            user_id,
            payload.name,
            payload.host,
            payload.port,
            payload.pairing_token,
            payload.system,
            payload.type,
            payload.group_name,
            payload.note,
        ),
    )
    conn.commit()
    created = get_device(conn, user_id, device_id)
    if not created:
        raise RuntimeError("Failed to create device")
    return created


def update_device(
    conn: sqlite3.Connection,
    user_id: str,
    device_id: str,
    payload: DeviceUpdate,
) -> DeviceOut | None:
    current = get_device(conn, user_id, device_id)
    if not current:
        return None

    values = payload.model_dump(exclude_unset=True)
    if not values:
        return current

    normalized: dict[str, object] = {}
    for key, value in values.items():
        if isinstance(value, str):
            value = value.strip()
        normalized[key] = value

    for required_field in ("name", "host", "pairing_token"):
        if required_field in normalized and not normalized[required_field]:
            raise ValueError(f"{required_field} cannot be empty")

    columns = ", ".join(f"{key} = ?" for key in normalized)
    conn.execute(
        f"UPDATE devices SET {columns}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
        (*normalized.values(), device_id, user_id),
    )
    conn.commit()
    return get_device(conn, user_id, device_id)


def mark_device_heartbeat(conn: sqlite3.Connection, user_id: str, device_id: str) -> str:
    checked_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    conn.execute(
        """
        UPDATE devices
        SET last_heartbeat_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
        """,
        (checked_at, device_id, user_id),
    )
    conn.commit()
    return checked_at


def delete_device(conn: sqlite3.Connection, user_id: str, device_id: str) -> bool:
    ensure_user(conn, user_id)
    conn.execute("DELETE FROM device_logs WHERE device_id = ? AND user_id = ?", (device_id, user_id))
    conn.execute("DELETE FROM commands WHERE device_id = ? AND user_id = ?", (device_id, user_id))
    result = conn.execute("DELETE FROM devices WHERE id = ? AND user_id = ?", (device_id, user_id))
    conn.commit()
    return result.rowcount > 0


def create_command(conn: sqlite3.Connection, user_id: str, device_id: str, action: str, payload: dict, status: str, result: str) -> CommandOut:
    ensure_user(conn, user_id)
    command_id = f"cmd-{uuid.uuid4().hex[:12]}"
    conn.execute(
        """
        INSERT INTO commands (id, user_id, device_id, action, payload, status, result)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (command_id, user_id, device_id, action, json.dumps(payload, ensure_ascii=False), status, result),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM commands WHERE id = ? AND user_id = ?", (command_id, user_id)).fetchone()
    return row_to_command(row)


def list_commands(conn: sqlite3.Connection, user_id: str) -> list[CommandOut]:
    ensure_user(conn, user_id)
    rows = conn.execute("SELECT * FROM commands WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall()
    return [row_to_command(row) for row in rows]


def get_command(conn: sqlite3.Connection, user_id: str, command_id: str) -> CommandOut | None:
    ensure_user(conn, user_id)
    row = conn.execute("SELECT * FROM commands WHERE id = ? AND user_id = ?", (command_id, user_id)).fetchone()
    return row_to_command(row) if row else None


def create_device_log(conn: sqlite3.Connection, user_id: str, device_id: str, level: str, message: str) -> DeviceLogOut:
    ensure_user(conn, user_id)
    log_id = f"log-{uuid.uuid4().hex[:12]}"
    conn.execute(
        """
        INSERT INTO device_logs (id, user_id, device_id, level, message)
        VALUES (?, ?, ?, ?, ?)
        """,
        (log_id, user_id, device_id, level, message),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM device_logs WHERE id = ? AND user_id = ?", (log_id, user_id)).fetchone()
    return row_to_device_log(row)


def list_device_logs(conn: sqlite3.Connection, user_id: str, device_id: str) -> list[DeviceLogOut]:
    ensure_user(conn, user_id)
    rows = conn.execute(
        "SELECT * FROM device_logs WHERE user_id = ? AND device_id = ? ORDER BY created_at DESC LIMIT 100",
        (user_id, device_id),
    ).fetchall()
    return [row_to_device_log(row) for row in rows]
