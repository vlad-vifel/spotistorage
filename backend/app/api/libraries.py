from fastapi import APIRouter
from pydantic import BaseModel
from app.models.config import Library
from app.services.config_store import load_config, save_config
from app.core.paths import playlists_dir, albums_dir, tracks_dir

router = APIRouter(prefix="/api/libraries", tags=["libraries"])


class CreateLibraryRequest(BaseModel):
    name: str
    root_path: str


@router.get("", response_model=list[Library])
def list_libraries():
    return load_config().libraries


@router.post("", response_model=Library, status_code=201)
def create_library(body: CreateLibraryRequest):
    config = load_config()
    existing = next((l for l in config.libraries if l.root_path == body.root_path), None)
    if existing:
        return existing
    lib = Library(name=body.name, root_path=body.root_path)
    if not config.libraries:
        config.active_library_id = lib.id
    for d in (playlists_dir, albums_dir, tracks_dir):
        d(body.root_path).mkdir(parents=True, exist_ok=True)
    config.libraries.append(lib)
    config.setup_complete = True
    save_config(config)
    return lib


@router.delete("/{library_id}", status_code=204)
def delete_library(library_id: str):
    config = load_config()
    config.libraries = [l for l in config.libraries if l.id != library_id]
    if config.active_library_id == library_id:
        config.active_library_id = config.libraries[0].id if config.libraries else None
    save_config(config)
