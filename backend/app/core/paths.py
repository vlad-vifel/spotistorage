from pathlib import Path


def resolve_safe(library_root: str, *parts: str) -> Path:
    root = Path(library_root).resolve()
    target = root.joinpath(*parts).resolve()
    if target != root and not target.is_relative_to(root):
        raise ValueError(f"Path traversal attempt: {target}")
    return target


def playlists_dir(library_root: str) -> Path:
    return resolve_safe(library_root, "Playlists")


def albums_dir(library_root: str) -> Path:
    return resolve_safe(library_root, "Albums")


def tracks_dir(library_root: str) -> Path:
    return resolve_safe(library_root, "Tracks")
