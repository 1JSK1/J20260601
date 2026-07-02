from __future__ import annotations

import argparse
import logging
import os
import sys
from pathlib import Path
import uvicorn


def application_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parents[1]


def ensure_application_dir_on_path() -> None:
    app_dir = str(application_dir())
    if app_dir not in sys.path:
        sys.path.insert(0, app_dir)


def configure_logging() -> Path:
    log_dir = application_dir() / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / "agent.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        handlers=[
            logging.FileHandler(log_path, encoding="utf-8"),
            logging.StreamHandler(),
        ],
        force=True,
    )
    return log_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Run ZhiKong Controlled Agent")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", default=7821, type=int)
    parser.add_argument(
        "--pairing-token",
        default=os.getenv("ZHIKONG_PAIRING_TOKEN", "dev-token"),
        help="Token required by controller requests",
    )
    args = parser.parse_args()

    os.environ["ZHIKONG_PAIRING_TOKEN"] = args.pairing_token
    log_path = configure_logging()
    logging.getLogger("zhikong-agent").info(
        "Starting agent host=%s port=%s executable=%s log=%s",
        args.host,
        args.port,
        sys.executable,
        log_path,
    )

    ensure_application_dir_on_path()

    from agent_lite.app.main import app

    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
