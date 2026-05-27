#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import tomllib
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from lib.reference_utils import parse_space_underscore_reference, to_reference_key, to_reference_label


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_REPO = Path("/tmp/Commentaries-Database")
DEFAULT_OUTPUT = ROOT / "public" / "study-library" / "commentaries" / "commentaries-database"


def main() -> int:
    repo_root = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_REPO
    output_root = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUTPUT

    if not repo_root.exists():
        raise SystemExit(f"Commentaries-Database repo not found: {repo_root}")

    output_root.mkdir(parents=True, exist_ok=True)

    book_buckets: dict[str, dict[str, list[dict]]] = defaultdict(lambda: defaultdict(list))
    author_count = 0
    skipped = []

    for author_dir in sorted(path for path in repo_root.iterdir() if path.is_dir()):
        metadata_path = author_dir / "metadata.toml"
        metadata = {}
        if metadata_path.exists():
            metadata = tomllib.loads(metadata_path.read_text())
        author_count += 1

        for entry_path in sorted(author_dir.glob("*.toml")):
            if entry_path.name == "metadata.toml":
                continue
            reference = parse_space_underscore_reference(entry_path.stem)
            if not reference:
                skipped.append(str(entry_path.relative_to(repo_root)))
                continue

            payload = tomllib.loads(entry_path.read_text())
            notes = payload.get("commentary", [])
            if not notes:
                continue

            reference_key = to_reference_key(reference)
            reference_label = to_reference_label(reference)

            for index, note in enumerate(notes, start=1):
                book_buckets[reference["bookId"]][reference_key].append(
                    {
                        "id": f"hcfaith:{reference_key}:{slugify(author_dir.name)}:{index}",
                        "referenceKey": reference_key,
                        "referenceLabel": reference_label,
                        "author": author_dir.name,
                        "year": metadata.get("default_year"),
                        "wiki": metadata.get("wiki"),
                        "sourceTitle": note.get("source_title"),
                        "sourceUrl": note.get("source_url"),
                        "quote": (note.get("quote") or "").strip(),
                    }
                )

    manifest = {
        "id": "historical-christian-faith-commentaries",
        "label": "Historical Christian Faith Commentaries",
        "sourceRepo": "https://github.com/HistoricalChristianFaith/Commentaries-Database",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "authorCount": author_count,
        "bookCount": len(book_buckets),
        "referenceCount": sum(len(entries_by_ref) for entries_by_ref in book_buckets.values()),
        "entryCount": sum(len(entries) for entries_by_ref in book_buckets.values() for entries in entries_by_ref.values()),
        "books": [],
        "skipped": skipped[:200],
    }

    for book_id, entries_by_ref in sorted(book_buckets.items()):
        reference_count = len(entries_by_ref)
        entry_count = sum(len(entries) for entries in entries_by_ref.values())
        output_path = output_root / f"{book_id}.json"
        output_path.write_text(
            json.dumps(
                {
                    "bookId": book_id,
                    "referenceCount": reference_count,
                    "entryCount": entry_count,
                    "entries": entries_by_ref,
                },
                ensure_ascii=True,
                separators=(",", ":"),
            )
            + "\n"
        )
        manifest["books"].append(
            {
                "bookId": book_id,
                "referenceCount": reference_count,
                "entryCount": entry_count,
                "path": f"/study-library/commentaries/commentaries-database/{book_id}.json",
            }
        )

    (output_root / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(
        f"Imported Commentaries-Database: {manifest['entryCount']} entries across "
        f"{manifest['referenceCount']} references in {manifest['bookCount']} books."
    )
    return 0


def slugify(value: str) -> str:
    return "-".join("".join(ch.lower() if ch.isalnum() else " " for ch in value).split())


if __name__ == "__main__":
    raise SystemExit(main())
