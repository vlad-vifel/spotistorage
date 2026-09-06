import json
from pathlib import Path
from app.core.atomic_write import write_json_atomic
from app.models.config import AppConfig

_CONFIG_PATH = Path(__file__).parents[3] / "config" / "user.json"


def load_config() -> AppConfig:
    if not _CONFIG_PATH.exists():
        return AppConfig()
    with open(_CONFIG_PATH, encoding="utf-8") as f:
        config = AppConfig.model_validate(json.load(f))
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
    write_json_atomic(_CONFIG_PATH, config.model_dump())


_SECRET_FIELDS = ("sp_dc", "deezer_arl")


def _mask_secret(value: str | None) -> str | None:
    if not value:
        return value
    tail = value[-4:] if len(value) > 4 else value
    return f"{tail}***"


def mask_secrets(config: AppConfig) -> AppConfig:
    return config.model_copy(update={f: _mask_secret(getattr(config, f)) for f in _SECRET_FIELDS})


def restore_masked_secrets(current: AppConfig, incoming: AppConfig) -> AppConfig:
    """If a secret field on `incoming` looks like the masked stub returned by
    `mask_secrets`, keep the real value from `current` instead of persisting the stub."""
    updates = {
        f: getattr(current, f)
        for f in _SECRET_FIELDS
        if (v := getattr(incoming, f)) and v.endswith("***")
    }
    return incoming.model_copy(update=updates) if updates else incoming
