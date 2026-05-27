#!/usr/bin/env python3
import json
import os
import ssl
import sys
import tempfile
from pathlib import Path

ssl._create_default_https_context = ssl._create_unverified_context

from meaningless import JSONDownloader  # type: ignore


TRANSLATION_NAMES = {
    "NKJV": "New King James Version",
    "AMP": "Amplified Bible",
    "NIV": "New International Version",
}


def normalize_book_name(value):
    return "".join(character.lower() for character in value if character.isalnum())


def build_chapter_payload(translation_code, translation_name, license_url, book_meta, chapter_number, verses):
    verse_items = []
    for verse_number, verse_text in verses.items():
        verse_items.append({
            "type": "verse",
            "number": int(verse_number),
            "content": [verse_text],
        })

    return {
        "translation": {
            "shortName": translation_code,
            "englishName": translation_name,
            "licenseUrl": license_url,
        },
        "book": {
            "id": book_meta["id"],
            "commonName": book_meta["commonName"],
            "name": book_meta["name"],
        },
        "numberOfVerses": len(verse_items),
        "chapter": {
            "number": int(chapter_number),
            "content": verse_items,
        },
    }


def main():
    if len(sys.argv) != 4:
        raise SystemExit("usage: import_private_translation.py <TRANSLATION_CODE> <PROVIDER_ID> <TARGET_ID>")

    translation_code = sys.argv[1].upper()
    provider_id = sys.argv[2]
    target_id = sys.argv[3]

    root = Path(__file__).resolve().parent.parent
    asv_manifest_path = root / "public" / "bibles" / "helloao" / "eng_asv" / "manifest.json"
    if not asv_manifest_path.exists():
        raise SystemExit(f"missing canonical manifest: {asv_manifest_path}")

    with asv_manifest_path.open("r", encoding="utf-8") as handle:
        canonical_manifest = json.load(handle)

    books = canonical_manifest["books"]
    output_root = root / "public" / "bibles" / "library" / target_id
    chapter_root = output_root / "chapters"
    chapter_root.mkdir(parents=True, exist_ok=True)

    downloader = JSONDownloader(
        translation=translation_code,
        show_passage_numbers=False,
        strip_excess_whitespace=True,
        enable_multiprocessing=False,
    )

    translation_name = TRANSLATION_NAMES.get(translation_code, translation_code)
    license_url = ""

    for index, book_meta in enumerate(books, start=1):
        expected_outputs = [
            chapter_root / f"{book_meta['id']}.{chapter_number}.json"
            for chapter_number in range(book_meta["firstChapterNumber"], book_meta["lastChapterNumber"] + 1)
        ]
        if all(path.exists() for path in expected_outputs):
            print(f"[{translation_code}] {index:02d}/{len(books)} {book_meta['commonName']} (cached)", flush=True)
            continue

        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
            temp_path = Path(tmp.name)

        try:
            result = downloader.download_book(book_meta["commonName"], str(temp_path))
            if result != 1:
                raise RuntimeError(f"download failed for {translation_code} {book_meta['commonName']}")

            with temp_path.open("r", encoding="utf-8") as handle:
                book_payload = json.load(handle)

            info = book_payload.get("Info", {})
            if not license_url:
                license_url = info.get("Copyright", "")
            book_keys = {normalize_book_name(key): value for key, value in book_payload.items() if key != "Info"}
            book_data = book_keys.get(normalize_book_name(book_meta["commonName"]), {})
            if not book_data:
                raise RuntimeError(f"missing book data for {translation_code} {book_meta['commonName']}")

            for chapter_number, verses in book_data.items():
                chapter_payload = build_chapter_payload(
                    translation_code,
                    translation_name,
                    license_url,
                    book_meta,
                    chapter_number,
                    verses,
                )
                output_path = chapter_root / f"{book_meta['id']}.{chapter_number}.json"
                with output_path.open("w", encoding="utf-8") as chapter_handle:
                    json.dump(chapter_payload, chapter_handle, ensure_ascii=False)
                    chapter_handle.write("\n")

            print(f"[{translation_code}] {index:02d}/{len(books)} {book_meta['commonName']}", flush=True)
        finally:
            temp_path.unlink(missing_ok=True)

    manifest = {
        "id": target_id,
        "providerId": provider_id,
        "label": f"{translation_code} Local Library",
        "sourceLabel": f"{translation_code} Local Library (BibleTranslations generator)",
        "translation": {
            "id": target_id,
            "shortName": translation_code,
            "englishName": translation_name,
            "licenseUrl": license_url,
        },
        "books": books,
        "installedAt": __import__("datetime").datetime.now().astimezone().isoformat(),
        "chapterCount": sum(book["numberOfChapters"] for book in books),
        "attribution": (
            f"{translation_name}. Generated locally with jadenzaleski/BibleTranslations "
            f"from privately installed source pages. Copyright/license reference: {license_url or 'unknown'}."
        ),
    }
    with (output_root / "manifest.json").open("w", encoding="utf-8") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


if __name__ == "__main__":
    main()
