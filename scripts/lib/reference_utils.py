from __future__ import annotations

import json
import re
from pathlib import Path


BOOKS_PATH = Path(__file__).with_name("canonical-books.json")
BOOKS = json.loads(BOOKS_PATH.read_text())


def _normalize_book_token(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace(".", "")).strip().lower()


ALIAS_MAP = {}
for book in BOOKS:
    for alias in book["aliases"]:
        ALIAS_MAP[_normalize_book_token(alias)] = book


def lookup_book(raw_name: str):
    return ALIAS_MAP.get(_normalize_book_token(raw_name))


def parse_space_underscore_reference(raw_reference: str):
    match = re.match(r"^(?P<book>.+?)\s+(?P<chapter>\d+)(?:_(?P<verses>\d+(?:-\d+)?))?$", raw_reference.strip())
    if not match:
        return None
    return _build_reference(match.group("book"), match.group("chapter"), match.group("verses"))


def parse_colon_reference(raw_reference: str):
    match = re.match(r"^(?P<book>.+?):(?P<chapter>\d+)(?::(?P<verses>\d+(?:-\d+)?))?$", raw_reference.strip())
    if not match:
        return None
    return _build_reference(match.group("book"), match.group("chapter"), match.group("verses"))


def to_reference_key(reference: dict) -> str:
    base = f"{reference['bookId']}.{reference['chapter']}"
    verse_start = reference.get("verseStart")
    verse_end = reference.get("verseEnd")
    if not verse_start:
        return base
    if verse_end and verse_end != verse_start:
        return f"{base}.{verse_start}-{verse_end}"
    return f"{base}.{verse_start}"


def to_reference_label(reference: dict) -> str:
    chapter_label = f"{reference['bookName']} {reference['chapter']}"
    verse_start = reference.get("verseStart")
    verse_end = reference.get("verseEnd")
    if not verse_start:
        return chapter_label
    if verse_end and verse_end != verse_start:
        return f"{chapter_label}:{verse_start}-{verse_end}"
    return f"{chapter_label}:{verse_start}"


def _build_reference(book_name: str, chapter_text: str, verses_text: str | None):
    book = lookup_book(book_name)
    if not book:
        return None
    chapter = int(chapter_text)
    verse_start = None
    verse_end = None
    if verses_text:
        parts = verses_text.split("-")
        verse_start = int(parts[0])
        verse_end = int(parts[1]) if len(parts) > 1 else verse_start
    return {
        "bookId": book["id"],
        "bookName": book["name"],
        "canonical": book["canonical"],
        "chapter": chapter,
        "verseStart": verse_start,
        "verseEnd": verse_end,
    }
