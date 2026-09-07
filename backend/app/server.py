import os
import uvicorn
from app.main import app


def run() -> None:
    port = int(os.environ.get("SPOTISTORAGE_PORT", "8000"))
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")


if __name__ == "__main__":
    run()
