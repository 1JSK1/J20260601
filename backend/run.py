from __future__ import annotations

import argparse
import sys
from pathlib import Path

import uvicorn


def ensure_repo_root_on_path() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    repo_root_text = str(repo_root)
    if repo_root_text not in sys.path:
        sys.path.insert(0, repo_root_text)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run ZhiKong Backend")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", default=8008, type=int)
    args = parser.parse_args()

    ensure_repo_root_on_path()

    from backend.app.main import app

    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
