from __future__ import annotations

from pydantic import BaseModel, Field, HttpUrl


class HealthResponse(BaseModel):
    ok: bool
    service: str
    version: str


class DeviceInfo(BaseModel):
    device_id: str
    name: str
    system: str
    type: str
    agent_version: str
    capabilities: list[str]


class ActionResponse(BaseModel):
    ok: bool
    action: str
    message: str


class OpenUrlRequest(BaseModel):
    url: HttpUrl


class OpenAppRequest(BaseModel):
    app: str = Field(min_length=1, max_length=64)


class PingRequest(BaseModel):
    message: str = "ping"
