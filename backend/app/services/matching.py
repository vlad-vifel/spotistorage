import re
import unicodedata

_BAD_KEYWORDS: dict[str, float] = {
    "live": -70,
    "concert": -70,
    "cover": -90,
    "karaoke": -90,
    "instrumental": -80,
    "acapella": -80,
    "remix": -35,
    "mashup": -60,
    "nightcore": -60,
    "reaction": -90,
    "tutorial": -90,
    "sped up": -40,
    "slowed": -35,
    "8d audio": -40,
    "demo": -35,
    "acoustic": -30,
}

_GOOD_KEYWORDS: dict[str, float] = {
    "official audio": 25,
    "official video": 15,
    "official music video": 15,
    "official": 8,
    "audio": 5,
    "lyrics": 3,
}

_TITLE_MATCH_BONUS = 35.0
_ARTIST_MATCH_BONUS = 25.0
_TOPIC_BONUS = 30.0

ACCEPT_THRESHOLD = 0.0


def normalize(text: str | None) -> str:
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", text).lower()
    return re.sub(r"[^\w]+", " ", text, flags=re.UNICODE).strip()


def search_safe(text: str | None) -> str:
    """Strips decorative Unicode symbols (☆, ★, ✰, …) that break Deezer's and
    YouTube's search parsers when combined with certain other terms. Only
    strips the Symbol category (Sm/Sc/Sk/So) — punctuation (commas, dashes,
    Japanese "、" etc.) is left alone since some searches depend on it.
    Only for building search query strings — scoring still uses the original text."""
    if not text:
        return ""
    return "".join(ch for ch in text if not unicodedata.category(ch).startswith("S")).strip()


def score_candidate(
    candidate_title: str,
    candidate_channel: str,
    target_title: str,
    target_artists: list[str],
) -> float | None:
    norm_title = normalize(candidate_title)
    norm_channel = normalize(candidate_channel)
    norm_target_title = normalize(target_title)
    norm_artists = [normalize(a) for a in target_artists if a]

    has_title_match = bool(norm_target_title) and norm_target_title in norm_title
    has_artist_match = any(a and (a in norm_title or a in norm_channel) for a in norm_artists)
    is_topic_channel = norm_channel.endswith("topic")

    if not (has_title_match or has_artist_match or is_topic_channel):
        return None

    score = 0.0
    if has_title_match:
        score += _TITLE_MATCH_BONUS
    if has_artist_match:
        score += _ARTIST_MATCH_BONUS
    if is_topic_channel:
        score += _TOPIC_BONUS

    for keyword, bonus in _GOOD_KEYWORDS.items():
        if keyword in norm_title:
            score += bonus

    for keyword, penalty in _BAD_KEYWORDS.items():
        if keyword in norm_title and keyword not in norm_target_title:
            score += penalty

    return score


def within_duration(
    candidate_duration: float | None,
    expected_duration_s: float | None,
    threshold: float,
) -> bool:
    if not expected_duration_s or expected_duration_s <= 0:
        return True
    if not candidate_duration:
        return False
    return abs(candidate_duration - expected_duration_s) <= threshold


def rank_candidates(
    candidates: list[dict],
    target_title: str,
    target_artists: list[str],
    expected_duration_s: float | None,
    duration_threshold: float,
) -> list[dict]:
    """Filter candidates to those within the duration threshold and looking like
    the right track (title or artist match), then rank by title/channel score."""
    scored: list[tuple[float, dict]] = []
    for c in candidates:
        if not within_duration(c.get("duration"), expected_duration_s, duration_threshold):
            continue
        score = score_candidate(
            c.get("title", ""), c.get("channel", ""), target_title, target_artists
        )
        if score is None or score < ACCEPT_THRESHOLD:
            continue
        scored.append((score, c))
    scored.sort(key=lambda x: -x[0])
    return [c for _, c in scored]
