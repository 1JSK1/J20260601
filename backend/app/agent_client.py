from __future__ import annotations

import httpx

from .schemas import DeviceOut


def base_url(device: DeviceOut) -> str:
    return f"http://{device.host}:{device.port}"


async def get_agent_info(device: DeviceOut, timeout: float = 5.0) -> dict:
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.get(
            f"{base_url(device)}/device/info",
            headers={"X-Pairing-Token": device.pairing_token},
        )
        response.raise_for_status()
        return response.json()


async def open_url(device: DeviceOut, url: str, timeout: float = 8.0) -> dict:
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            f"{base_url(device)}/actions/open-url",
            headers={"X-Pairing-Token": device.pairing_token},
            json={"url": url},
        )
        response.raise_for_status()
        return response.json()


async def open_app(device: DeviceOut, app: str, timeout: float = 8.0) -> dict:
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            f"{base_url(device)}/actions/open-app",
            headers={"X-Pairing-Token": device.pairing_token},
            json={"app": app},
        )
        response.raise_for_status()
        return response.json()
