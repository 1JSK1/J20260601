from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import time
import uuid
from urllib.parse import urlencode

from .schemas import TencentAsrSessionOut


SIGNATURE_TTL_SECONDS = 5 * 60
ASR_HOST = "asr.cloud.tencent.com"


def create_signed_session(credentials: dict[str, str]) -> TencentAsrSessionOut:
    timestamp = int(time.time())
    expires_at = timestamp + SIGNATURE_TTL_SECONDS
    voice_id = str(uuid.uuid4())
    params = {
        "engine_model_type": credentials["engine"],
        "expired": str(expires_at),
        "filter_empty_result": "1",
        "filter_modal": "1",
        "filter_punc": "1",
        "needvad": "1",
        "nonce": str(secrets.randbelow(2_000_000_000) + 1),
        "secretid": credentials["secret_id"],
        "timestamp": str(timestamp),
        "vad_silence_time": "800",
        "voice_format": "1",
        "voice_id": voice_id,
    }
    query = urlencode(sorted(params.items()))
    path = f"{ASR_HOST}/asr/v2/{credentials['app_id']}?{query}"
    digest = hmac.new(
        credentials["secret_key"].encode("utf-8"),
        path.encode("utf-8"),
        hashlib.sha1,
    ).digest()
    signature = base64.b64encode(digest).decode("ascii")
    url = f"wss://{path}&signature={urlencode({'signature': signature})[10:]}"
    return TencentAsrSessionOut(
        url=url,
        voice_id=voice_id,
        expires_at=expires_at,
    )
