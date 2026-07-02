from __future__ import annotations

import logging
import os
import platform
import shutil
import subprocess
import webbrowser
from pathlib import Path

from .models import ActionResponse

logger = logging.getLogger("zhikong-agent.actions")

WINDOWS_APP_ALIASES = {
    "notepad": "notepad.exe",
    "calculator": "calc.exe",
    "cmd": "cmd.exe",
    "explorer": "explorer.exe",
}


def _windows_executable(name: str) -> str:
    windows_dir = Path(os.environ.get("WINDIR", r"C:\Windows"))
    system_path = windows_dir / "System32" / name
    if system_path.exists():
        return str(system_path)
    return shutil.which(name) or name


def _windows_shell_open(target: str) -> None:
    os.startfile(target)  # type: ignore[attr-defined]


def open_url(url: str) -> ActionResponse:
    try:
        if platform.system() == "Windows":
            _windows_shell_open(url)
        else:
            opened = webbrowser.open(url, new=2)
            if not opened:
                raise RuntimeError("系统没有可用的默认浏览器")
        logger.info("Opened URL: %s", url)
        return ActionResponse(ok=True, action="open-url", message=f"已请求默认浏览器打开：{url}")
    except Exception as exc:
        logger.exception("Failed to open URL: %s", url)
        return ActionResponse(ok=False, action="open-url", message=f"打开浏览器失败：{type(exc).__name__}: {exc}")


def open_app(app: str) -> ActionResponse:
    normalized = app.strip().lower()
    system = platform.system()

    try:
        if system == "Windows":
            executable_name = WINDOWS_APP_ALIASES.get(normalized)
            if not executable_name:
                return ActionResponse(ok=False, action="open-app", message=f"不允许启动此应用：{app}")
            executable = _windows_executable(executable_name)
            _windows_shell_open(executable)
            logger.info("Opened Windows app: alias=%s executable=%s", normalized, executable)
            return ActionResponse(ok=True, action="open-app", message=f"已启动应用：{normalized}")

        if system == "Darwin":
            subprocess.Popen(["open", "-a", app], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            logger.info("Opened macOS app: %s", app)
            return ActionResponse(ok=True, action="open-app", message=f"已启动应用：{app}")

        if system == "Linux":
            if "/" in app or "\\" in app:
                return ActionResponse(ok=False, action="open-app", message="不允许直接执行应用路径")
            executable = shutil.which(app)
            if not executable:
                return ActionResponse(ok=False, action="open-app", message=f"找不到应用：{app}")
            subprocess.Popen([executable], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            logger.info("Opened Linux app: %s", executable)
            return ActionResponse(ok=True, action="open-app", message=f"已启动应用：{app}")

        return ActionResponse(ok=False, action="open-app", message=f"暂不支持此系统：{system}")
    except Exception as exc:
        logger.exception("Failed to open app: alias=%s system=%s", normalized, system)
        return ActionResponse(ok=False, action="open-app", message=f"启动应用失败：{type(exc).__name__}: {exc}")
