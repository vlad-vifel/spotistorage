import json
from app.core.atomic_write import write_json_atomic
from app.core.compat import model_dump, model_validate
from app.core.paths import config_dir
from app.models.config import AppConfig

_CONFIG_PATH = config_dir() / "user.json"


def load_config() -> AppConfig:
    if not _CONFIG_PATH.exists():
        return AppConfig()
    with open(_CONFIG_PATH, encoding="utf-8") as f:
        config = model_validate(AppConfig, json.load(f))
    seen: set[str] = set()
    deduped = []
    for lib in config.libraries:
        if lib.root_path not in seen:
            seen.add(lib.root_path)
            deduped.append(lib)
    if len(deduped) != len(config.libraries):
        config.libraries = deduped
        save_config(config)
    return config


def save_config(config: AppConfig) -> None:
    write_json_atomic(_CONFIG_PATH, model_dump(config))
