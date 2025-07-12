from urllib.parse import quote


def normalize_tag(tag: str) -> str:
    """Internal canon form: upper-case, no leading #."""
    return tag.upper().lstrip("#")


def encode_tag(tag: str) -> str:
    """Outbound form for Supercell API: %23ABC123."""
    return quote(f"#{normalize_tag(tag)}", safe="")
