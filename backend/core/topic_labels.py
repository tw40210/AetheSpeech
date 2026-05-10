DEFAULT_UNCLEAR_LABEL = {"key": "UNCLEAR", "name": "Unclear or incomplete"}


def ensure_default_unclear_label(labels: list[dict] | None) -> list[dict]:
    """Return labels with the UNCLEAR fallback label appended if missing."""
    normalized = list(labels or [])
    keys = {str(label.get("key", "")).upper() for label in normalized}
    if DEFAULT_UNCLEAR_LABEL["key"] not in keys:
        normalized.append(DEFAULT_UNCLEAR_LABEL.copy())
    return normalized
