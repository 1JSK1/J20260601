from __future__ import annotations

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    ok: bool
    service: str
    version: str


class UserOut(BaseModel):
    id: str
    username: str
    display_name: str
    status: str
    created_at: str
    updated_at: str


class AuthRegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=40, pattern=r"^[a-zA-Z0-9_-]+$")
    password: str = Field(min_length=6, max_length=128)
    display_name: str = Field(default="", max_length=80)


class AuthLoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=40)
    password: str = Field(min_length=1, max_length=128)


class AuthResponse(BaseModel):
    ok: bool
    user: UserOut
    session_id: str
    message: str


class DeviceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    host: str = Field(min_length=3, max_length=120)
    port: int = Field(default=7821, ge=1, le=65535)
    pairing_token: str = Field(default="dev-token", min_length=1, max_length=128)
    system: str = "Unknown"
    type: str = "unknown"
    group_name: str = "默认分组"
    note: str = ""


class DeviceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    host: str | None = Field(default=None, min_length=3, max_length=120)
    port: int | None = Field(default=None, ge=1, le=65535)
    pairing_token: str | None = Field(default=None, min_length=1, max_length=128)
    system: str | None = Field(default=None, max_length=40)
    type: str | None = Field(default=None, max_length=40)
    group_name: str | None = Field(default=None, max_length=80)
    note: str | None = Field(default=None, max_length=500)


class DeviceOut(DeviceCreate):
    id: str
    user_id: str
    last_heartbeat_at: str | None = None
    created_at: str
    updated_at: str


class AgentTestResponse(BaseModel):
    ok: bool
    message: str
    agent: dict | None = None
    checked_at: str


class OpenUrlRequest(BaseModel):
    url: str = Field(min_length=4, max_length=500)
    source: str = Field(default="text", pattern=r"^(text|voice)$")
    original_command: str = Field(default="", max_length=500)


class OpenAppRequest(BaseModel):
    app: str = Field(min_length=1, max_length=64)
    source: str = Field(default="text", pattern=r"^(text|voice)$")
    original_command: str = Field(default="", max_length=500)


class ActionResponse(BaseModel):
    ok: bool
    command_id: str
    message: str
    agent_response: dict | None = None


class CommandOut(BaseModel):
    id: str
    user_id: str
    device_id: str
    action: str
    payload: str
    status: str
    result: str
    created_at: str


class CommandRecordCreate(BaseModel):
    device_id: str = Field(min_length=1, max_length=80)
    action: str = Field(min_length=1, max_length=80)
    original_command: str = Field(min_length=1, max_length=500)
    source: str = Field(default="text", pattern=r"^(text|voice)$")
    status: str = Field(pattern=r"^(success|failed)$")
    result: str = Field(min_length=1, max_length=1000)


class DeviceLogOut(BaseModel):
    id: str
    user_id: str
    device_id: str
    level: str
    message: str
    created_at: str


class ApiConfigOut(BaseModel):
    id: str
    user_id: str
    backend_base_url: str
    ai_base_url: str
    ai_api_key: str
    ai_model: str
    timeout_ms: int
    max_retries: int
    created_at: str
    updated_at: str


class ApiConfigUpdate(BaseModel):
    backend_base_url: str = Field(min_length=8, max_length=500, pattern=r"^https?://")


class TencentAsrConfigUpdate(BaseModel):
    app_id: str = Field(min_length=5, max_length=32, pattern=r"^\d+$")
    secret_id: str = Field(min_length=8, max_length=128)
    secret_key: str = Field(default="", max_length=256)
    engine: str = Field(default="16k_zh", pattern=r"^16k_zh$")
    enabled: bool = True


class TencentAsrConfigOut(BaseModel):
    app_id: str
    secret_id: str
    secret_key_configured: bool
    engine: str
    enabled: bool
    configured: bool
    updated_at: str


class TencentAsrSessionOut(BaseModel):
    url: str
    voice_id: str
    expires_at: int
    sample_rate: int = 16000
    channels: int = 1
    bits_per_sample: int = 16
    frame_bytes: int = 6400
