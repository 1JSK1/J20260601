from __future__ import annotations

import platform
import socket

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .actions import open_app, open_url
from .models import ActionResponse, DeviceInfo, HealthResponse, OpenAppRequest, OpenUrlRequest, PingRequest
from .security import require_pairing_token

VERSION = "0.2.0"

app = FastAPI(title="智控被控端", version=VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(ok=True, service="my-app-lite-agent", version=VERSION)


@app.get("/device/info", response_model=DeviceInfo, dependencies=[Depends(require_pairing_token)])
def device_info() -> DeviceInfo:
    system = platform.system() or "Unknown"
    hostname = socket.gethostname()
    return DeviceInfo(
        device_id=f"{system.lower()}-{hostname}",
        name=hostname,
        system=system,
        type="computer" if system in {"Windows", "Linux", "Darwin"} else "unknown",
        agent_version=VERSION,
        capabilities=["open-url", "open-app", "ping"],
    )


@app.post("/actions/open-url", response_model=ActionResponse, dependencies=[Depends(require_pairing_token)])
def action_open_url(payload: OpenUrlRequest) -> ActionResponse:
    return open_url(str(payload.url))


@app.post("/actions/open-app", response_model=ActionResponse, dependencies=[Depends(require_pairing_token)])
def action_open_app(payload: OpenAppRequest) -> ActionResponse:
    return open_app(payload.app)


@app.post("/actions/ping", response_model=ActionResponse, dependencies=[Depends(require_pairing_token)])
def action_ping(payload: PingRequest) -> ActionResponse:
    return ActionResponse(ok=True, action="ping", message=f"pong: {payload.message}")
