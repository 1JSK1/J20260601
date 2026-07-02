from __future__ import annotations

import sqlite3
from datetime import datetime, timezone

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import agent_client
from .auth import get_current_user_id, require_authenticated_user_id
from .db import get_db, init_db
from .repository import (
    create_command,
    create_device,
    create_device_log,
    create_session,
    delete_device,
    delete_session,
    authenticate_user,
    ensure_user,
    get_api_config,
    get_tencent_asr_config,
    get_tencent_asr_credentials,
    get_command,
    get_device,
    list_commands,
    list_device_logs,
    list_devices,
    mark_device_heartbeat,
    register_user,
    update_api_config,
    update_device,
    update_tencent_asr_config,
)
from .schemas import (
    ActionResponse,
    AgentTestResponse,
    ApiConfigOut,
    ApiConfigUpdate,
    AuthLoginRequest,
    AuthRegisterRequest,
    AuthResponse,
    CommandRecordCreate,
    CommandOut,
    DeviceCreate,
    DeviceLogOut,
    DeviceOut,
    DeviceUpdate,
    HealthResponse,
    OpenAppRequest,
    OpenUrlRequest,
    TencentAsrConfigOut,
    TencentAsrConfigUpdate,
    TencentAsrSessionOut,
    UserOut,
)
from .tencent_asr import create_signed_session

VERSION = "0.7.0"

app = FastAPI(title="智控后端", version=VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/")
def root() -> dict:
    return {
        "ok": True,
        "service": "my-app-backend",
        "version": VERSION,
        "message": "My App 后端服务正在运行。前端 App 请访问 http://localhost:8083/，接口文档请访问 /docs。",
        "multi_user": "enabled",
        "user_header": "X-Session-Id",
        "endpoints": [
            "/health",
            "/auth/register",
            "/auth/login",
            "/me",
            "/api-config",
            "/speech/tencent/config",
            "/speech/tencent/session",
            "/devices",
            "/commands",
            "/docs",
        ],
    }


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(ok=True, service="my-app-backend", version=VERSION)


@app.post("/auth/register", response_model=AuthResponse)
def api_register(
    payload: AuthRegisterRequest,
    conn: sqlite3.Connection = Depends(get_db),
) -> AuthResponse:
    try:
        user = register_user(conn, payload)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    session_id = create_session(conn, user.id)
    return AuthResponse(ok=True, user=user, session_id=session_id, message="注册成功")


@app.post("/auth/login", response_model=AuthResponse)
def api_login(
    payload: AuthLoginRequest,
    conn: sqlite3.Connection = Depends(get_db),
) -> AuthResponse:
    user = authenticate_user(conn, payload)
    if not user:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    session_id = create_session(conn, user.id)
    return AuthResponse(ok=True, user=user, session_id=session_id, message="登录成功")


@app.post("/auth/logout")
def api_logout(
    conn: sqlite3.Connection = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    x_session_id: str | None = Header(default=None, alias="X-Session-Id"),
) -> dict:
    if x_session_id:
        delete_session(conn, user_id, x_session_id)
    return {"ok": True}


@app.get("/me", response_model=UserOut)
def api_me(
    conn: sqlite3.Connection = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> UserOut:
    return ensure_user(conn, user_id)


@app.get("/api-config", response_model=ApiConfigOut)
def api_get_api_config(
    conn: sqlite3.Connection = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> ApiConfigOut:
    return get_api_config(conn, user_id)


@app.put("/api-config", response_model=ApiConfigOut)
def api_update_api_config(
    payload: ApiConfigUpdate,
    conn: sqlite3.Connection = Depends(get_db),
    user_id: str = Depends(require_authenticated_user_id),
) -> ApiConfigOut:
    return update_api_config(conn, user_id, payload.backend_base_url)


@app.get("/speech/tencent/config", response_model=TencentAsrConfigOut)
def api_get_tencent_asr_config(
    conn: sqlite3.Connection = Depends(get_db),
    user_id: str = Depends(require_authenticated_user_id),
) -> TencentAsrConfigOut:
    return get_tencent_asr_config(conn, user_id)


@app.put("/speech/tencent/config", response_model=TencentAsrConfigOut)
def api_update_tencent_asr_config(
    payload: TencentAsrConfigUpdate,
    conn: sqlite3.Connection = Depends(get_db),
    user_id: str = Depends(require_authenticated_user_id),
) -> TencentAsrConfigOut:
    try:
        return update_tencent_asr_config(conn, user_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/speech/tencent/session", response_model=TencentAsrSessionOut)
def api_create_tencent_asr_session(
    conn: sqlite3.Connection = Depends(get_db),
    user_id: str = Depends(require_authenticated_user_id),
) -> TencentAsrSessionOut:
    try:
        credentials = get_tencent_asr_credentials(conn, user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return create_signed_session(credentials)


@app.get("/devices", response_model=list[DeviceOut])
def api_list_devices(
    conn: sqlite3.Connection = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> list[DeviceOut]:
    return list_devices(conn, user_id)


@app.post("/devices", response_model=DeviceOut)
def api_create_device(
    payload: DeviceCreate,
    conn: sqlite3.Connection = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> DeviceOut:
    return create_device(conn, user_id, payload)


@app.get("/devices/{device_id}", response_model=DeviceOut)
def api_get_device(
    device_id: str,
    conn: sqlite3.Connection = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> DeviceOut:
    device = get_device(conn, user_id, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@app.patch("/devices/{device_id}", response_model=DeviceOut)
def api_update_device(
    device_id: str,
    payload: DeviceUpdate,
    conn: sqlite3.Connection = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> DeviceOut:
    try:
        device = update_device(conn, user_id, device_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@app.delete("/devices/{device_id}")
def api_delete_device(
    device_id: str,
    conn: sqlite3.Connection = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    deleted = delete_device(conn, user_id, device_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Device not found")
    return {"ok": True}


@app.get("/devices/{device_id}/logs", response_model=list[DeviceLogOut])
def api_list_device_logs(
    device_id: str,
    conn: sqlite3.Connection = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> list[DeviceLogOut]:
    device = get_device(conn, user_id, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return list_device_logs(conn, user_id, device_id)


@app.post("/devices/{device_id}/test", response_model=AgentTestResponse)
async def api_test_device(
    device_id: str,
    conn: sqlite3.Connection = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> AgentTestResponse:
    device = get_device(conn, user_id, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    try:
        info = await agent_client.get_agent_info(device)
        checked_at = mark_device_heartbeat(conn, user_id, device_id)
        create_device_log(conn, user_id, device_id, "success", "Agent reachable")
        return AgentTestResponse(ok=True, message="Agent reachable", agent=info, checked_at=checked_at)
    except httpx.HTTPStatusError as exc:
        message = f"Agent returned HTTP {exc.response.status_code}"
        create_device_log(conn, user_id, device_id, "error", message)
        return AgentTestResponse(
            ok=False,
            message=message,
            agent=None,
            checked_at=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        )
    except httpx.HTTPError as exc:
        message = f"Agent unreachable: {exc}"
        create_device_log(conn, user_id, device_id, "error", message)
        return AgentTestResponse(
            ok=False,
            message=message,
            agent=None,
            checked_at=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        )


@app.post("/devices/{device_id}/actions/open-url", response_model=ActionResponse)
async def api_open_url(
    device_id: str,
    payload: OpenUrlRequest,
    conn: sqlite3.Connection = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> ActionResponse:
    device = get_device(conn, user_id, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    request_payload = payload.model_dump()
    try:
        result = await agent_client.open_url(device, payload.url)
        ok = bool(result.get("ok", True))
        command = create_command(
            conn,
            user_id,
            device_id,
            "open-url",
            request_payload,
            "success" if ok else "failed",
            result.get("message", "ok"),
        )
        create_device_log(conn, user_id, device_id, "success" if ok else "error", command.result)
        return ActionResponse(ok=ok, command_id=command.id, message=command.result, agent_response=result)
    except httpx.HTTPError as exc:
        command = create_command(conn, user_id, device_id, "open-url", request_payload, "failed", str(exc))
        create_device_log(conn, user_id, device_id, "error", command.result)
        return ActionResponse(ok=False, command_id=command.id, message=command.result, agent_response=None)


@app.post("/devices/{device_id}/actions/open-app", response_model=ActionResponse)
async def api_open_app(
    device_id: str,
    payload: OpenAppRequest,
    conn: sqlite3.Connection = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> ActionResponse:
    device = get_device(conn, user_id, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    request_payload = payload.model_dump()
    try:
        result = await agent_client.open_app(device, payload.app)
        status = "success" if result.get("ok") else "failed"
        command = create_command(conn, user_id, device_id, "open-app", request_payload, status, result.get("message", "ok"))
        create_device_log(conn, user_id, device_id, "success" if result.get("ok") else "error", command.result)
        return ActionResponse(ok=bool(result.get("ok")), command_id=command.id, message=command.result, agent_response=result)
    except httpx.HTTPError as exc:
        command = create_command(conn, user_id, device_id, "open-app", request_payload, "failed", str(exc))
        create_device_log(conn, user_id, device_id, "error", command.result)
        return ActionResponse(ok=False, command_id=command.id, message=command.result, agent_response=None)


@app.get("/commands", response_model=list[CommandOut])
def api_list_commands(
    conn: sqlite3.Connection = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> list[CommandOut]:
    return list_commands(conn, user_id)


@app.post("/commands/records", response_model=CommandOut)
def api_create_command_record(
    payload: CommandRecordCreate,
    conn: sqlite3.Connection = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> CommandOut:
    device = get_device(conn, user_id, payload.device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    command = create_command(
        conn,
        user_id,
        payload.device_id,
        payload.action,
        {
            "source": payload.source,
            "original_command": payload.original_command,
        },
        payload.status,
        payload.result,
    )
    create_device_log(
        conn,
        user_id,
        payload.device_id,
        "success" if payload.status == "success" else "error",
        payload.result,
    )
    return command


@app.get("/commands/{command_id}", response_model=CommandOut)
def api_get_command(
    command_id: str,
    conn: sqlite3.Connection = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> CommandOut:
    command = get_command(conn, user_id, command_id)
    if not command:
        raise HTTPException(status_code=404, detail="Command not found")
    return command
