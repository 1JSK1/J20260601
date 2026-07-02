from __future__ import annotations

import os

from fastapi import Header, HTTPException


def require_pairing_token(x_pairing_token: str | None = Header(default=None)) -> None:
    pairing_token = os.getenv("ZHIKONG_PAIRING_TOKEN", "dev-token")
    if x_pairing_token != pairing_token:
        raise HTTPException(status_code=401, detail="Invalid or missing pairing token")
