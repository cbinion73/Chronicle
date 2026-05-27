#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 /absolute/path/to/file.pdf [output-stem] [--pages 1-20] [--force-ocr]"
  exit 1
fi

if ! command -v ocrmypdf >/dev/null 2>&1; then
  echo "ocrmypdf is not installed."
  exit 1
fi

if ! command -v pdftotext >/dev/null 2>&1; then
  echo "pdftotext is not installed."
  exit 1
fi

INPUT_PDF="$1"
shift

if [[ ! -f "$INPUT_PDF" ]]; then
  echo "Input PDF not found: $INPUT_PDF"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_DIR="$ROOT_DIR/data/ocr"
mkdir -p "$OUTPUT_DIR"

STEM=""
PAGE_RANGE=""
FORCE_OCR="0"

if [[ $# -gt 0 && "$1" != "--pages" ]]; then
  STEM="$1"
  shift
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pages)
      if [[ $# -lt 2 ]]; then
        echo "Usage: $0 /absolute/path/to/file.pdf [output-stem] [--pages 1-20] [--force-ocr]"
        exit 1
      fi
      PAGE_RANGE="$2"
      shift 2
      ;;
    --force-ocr)
      FORCE_OCR="1"
      shift
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: $0 /absolute/path/to/file.pdf [output-stem] [--pages 1-20] [--force-ocr]"
      exit 1
      ;;
  esac
done

if [[ -n "$STEM" ]]; then
  STEM="$STEM"
else
  BASENAME="$(basename "$INPUT_PDF")"
  STEM="${BASENAME%.*}"
  STEM="${STEM// /-}"
fi

OCR_PDF="$OUTPUT_DIR/${STEM}.ocr.pdf"
TEXT_FILE="$OUTPUT_DIR/${STEM}.txt"
META_FILE="$OUTPUT_DIR/${STEM}.json"
mkdir -p "$(dirname "$OCR_PDF")"
mkdir -p "$(dirname "$TEXT_FILE")"
mkdir -p "$(dirname "$META_FILE")"
WORK_PDF="$INPUT_PDF"
TEMP_SLICE=""

if [[ -n "$PAGE_RANGE" ]]; then
  if ! command -v qpdf >/dev/null 2>&1; then
    echo "qpdf is required for --pages slicing."
    exit 1
  fi
  TEMP_SLICE="$OUTPUT_DIR/${STEM}.source-slice.pdf"
  echo "Slicing pages $PAGE_RANGE..."
  qpdf "$INPUT_PDF" --pages "$INPUT_PDF" "$PAGE_RANGE" -- "$TEMP_SLICE"
  WORK_PDF="$TEMP_SLICE"
fi

if [[ "$FORCE_OCR" == "1" ]]; then
  OCR_TEXT_MODE="--force-ocr"
  echo "OCRing PDF with a fresh text layer..."
else
  OCR_TEXT_MODE="--skip-text"
  echo "OCRing PDF..."
fi

ocrmypdf \
  "$OCR_TEXT_MODE" \
  --rotate-pages \
  --deskew \
  --clean \
  --optimize 1 \
  "$WORK_PDF" \
  "$OCR_PDF"

echo "Extracting text..."
pdftotext -layout "$OCR_PDF" "$TEXT_FILE"

PAGE_COUNT="$(pdfinfo "$OCR_PDF" | awk -F': ' '/^Pages:/ {print $2}')"

python3 - <<PY
import json
from pathlib import Path

meta = {
    "source_pdf": "$INPUT_PDF",
    "page_range": "$PAGE_RANGE",
    "force_ocr": "$FORCE_OCR" == "1",
    "ocr_pdf": "$OCR_PDF",
    "text_file": "$TEXT_FILE",
    "page_count": int("${PAGE_COUNT:-0}".strip() or "0"),
}

Path("$META_FILE").write_text(json.dumps(meta, indent=2), encoding="utf-8")
PY

echo "Done."
echo "OCR PDF: $OCR_PDF"
echo "Text:    $TEXT_FILE"
echo "Meta:    $META_FILE"

if [[ -n "$TEMP_SLICE" && -f "$TEMP_SLICE" ]]; then
  rm -f "$TEMP_SLICE"
fi
