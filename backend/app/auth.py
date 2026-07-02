from __future__ import annotations

import sqlite3

from fastapi import Depends, Header, HTTPException

from .db import get_db


def get_current_user_id(
    conn: sqlite3.Connection = Depends(get_db),
    x_session_id: str | None = Header(default=None, alias="X-Session-Id"),
) -> str:
    if x_session_id:
        session_id = x_session_id.strip()
        row = conn.execute(
            """
            SELECT user_id
            FROM user_sessions
            WHERE id = ? AND last_seen_at >= datetime('now', '-30 days')
            """,
            (session_id,),
        ).fetchone()
        if row:
            conn.execute("UPDATE user_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?", (session_id,))
            conn.commit()
            return str(row["user_id"])
        raise HTTPException(status_code=401, detail="登录会话已失效，请重新登录")

    raise HTTPException(status_code=401, detail="请先登录账号")


def require_authenticated_user_id(
    conn: sqlite3.Connection = Depends(get_db),
    x_session_id: str | None = Header(default=None, alias="X-Session-Id"),
) -> str:
    if not x_session_id:
        raise HTTPException(status_code=401, detail="请先登录账号")

    session_id = x_session_id.strip()
    row = conn.execute(
        """
        SELECT user_id
        FROM user_sessions
        WHERE id = ? AND last_seen_at >= datetime('now', '-30 days')
        """,
        (session_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="登录会话已失效，请重新登录")

    conn.execute("UPDATE user_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?", (session_id,))
    conn.commit()
    return str(row["user_id"])
