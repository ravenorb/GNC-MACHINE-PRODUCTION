from __future__ import annotations

import argparse
import http.server
import mimetypes
import socketserver
from pathlib import Path
from urllib.parse import unquote

REPO_ROOT = Path(__file__).resolve().parents[1]
WEB_ROOT = REPO_ROOT / "src" / "web"


class ProductionRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO_ROOT), **kwargs)

    def translate_path(self, path: str) -> str:
        cleaned_path = unquote(path)
        if cleaned_path in {"", "/"}:
            cleaned_path = "/src/web/index.html"
        elif cleaned_path.startswith("/static/"):
            cleaned_path = "/src/web/" + cleaned_path[len("/static/"):]
        return super().translate_path(cleaned_path)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def guess_type(self, path: str) -> str:
        if path.endswith(".mpf"):
            return "text/plain"
        return mimetypes.guess_type(path)[0] or "application/octet-stream"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the production manager web server.")
    parser.add_argument("--host", default="0.0.0.0", help="Host interface to bind.")
    parser.add_argument("--port", type=int, default=80, help="Port to listen on.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    handler = ProductionRequestHandler
    with socketserver.TCPServer((args.host, args.port), handler) as httpd:
        print(f"Serving production manager UI on http://{args.host}:{args.port}")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
