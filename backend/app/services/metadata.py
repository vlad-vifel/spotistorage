import ipaddress
import socket
import urllib.request
from pathlib import Path
from urllib.parse import urlparse
from mutagen.id3 import (
    ID3, TIT2, TPE1, TALB, TPE2, TRCK, TPOS, TDRC, APIC, error as ID3Error
)


def _is_safe_artwork_host(url: str) -> bool:
    """Artwork URLs come from Spotify metadata, which is untrusted external
    input — refuse to fetch anything that resolves to a local/private address
    so a malicious source can't use this as an SSRF probe into the LAN."""
    try:
        host = urlparse(url).hostname
        if not host:
            return False
        for family, _, _, _, sockaddr in socket.getaddrinfo(host, None):
            ip = ipaddress.ip_address(sockaddr[0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                return False
        return True
    except Exception:
        return False


def _image_mime(data: bytes) -> str:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"GIF87a") or data.startswith(b"GIF89a"):
        return "image/gif"
    return "image/jpeg"


def embed_metadata(
    mp3_path: Path,
    title: str,
    artists: list[str],
    album: str,
    album_artist: str,
    track_number: int,
    disc_number: int,
    year: str,
    artwork_url: str | None,
) -> None:
    try:
        tags = ID3(mp3_path)
    except ID3Error:
        tags = ID3()

    tags["TIT2"] = TIT2(encoding=3, text=title)
    tags["TPE1"] = TPE1(encoding=3, text=", ".join(artists))
    tags["TALB"] = TALB(encoding=3, text=album)
    tags["TPE2"] = TPE2(encoding=3, text=album_artist)
    tags["TRCK"] = TRCK(encoding=3, text=str(track_number))
    tags["TPOS"] = TPOS(encoding=3, text=str(disc_number))
    tags["TDRC"] = TDRC(encoding=3, text=str(year))

    if artwork_url and artwork_url.startswith(("http://", "https://")) and _is_safe_artwork_host(artwork_url):
        try:
            req = urllib.request.Request(artwork_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                img_data = resp.read(10 * 1024 * 1024)
            tags["APIC"] = APIC(
                encoding=3,
                mime=_image_mime(img_data),
                type=3,
                desc="Cover",
                data=img_data,
            )
        except Exception:
            pass

    tags.save(mp3_path, v2_version=3)
