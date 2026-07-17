import json
import os
from pathlib import Path

os.environ["ENABLE_MOCK_WORKSPACE_API"] = "true"

from app.main import app  # noqa: E402

target = Path(__file__).resolve().parents[1] / "openapi" / "astraos-v1.json"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(app.openapi(), indent=2, sort_keys=True) + "\n", encoding="utf-8")
print(target)
