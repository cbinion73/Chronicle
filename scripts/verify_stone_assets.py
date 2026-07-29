#!/usr/bin/env python3
"""Verify the visual contract for Chronicle's prayer-bead assets."""

from pathlib import Path
import sys

try:
    from PIL import Image
except ImportError:
    print("Pillow is required: python3 -m pip install Pillow", file=sys.stderr)
    raise SystemExit(2)


ASSET_DIR = Path(__file__).resolve().parents[1] / "src" / "assets" / "stones"
EXPECTED = {
    "agate.webp", "amethyst.webp", "beryl.webp", "carbuncle.webp",
    "centerpiece.webp", "diamond.webp", "emerald.webp", "gold.webp",
    "jasper.webp", "large-cross.webp", "onyx.webp", "ruby.webp",
    "sapphire.webp", "silver-cross.webp", "topaz.webp",
}
ROUND_BEADS = EXPECTED - {"centerpiece.webp", "large-cross.webp", "silver-cross.webp"}


def fail(message: str, failures: list[str]) -> None:
    failures.append(message)


def main() -> int:
    failures: list[str] = []
    actual = {path.name for path in ASSET_DIR.glob("*.webp")}

    for missing in sorted(EXPECTED - actual):
        fail(f"missing asset: {missing}", failures)
    for unexpected in sorted(actual - EXPECTED):
        fail(f"unexpected asset: {unexpected}", failures)

    for name in sorted(EXPECTED & actual):
        path = ASSET_DIR / name
        with Image.open(path) as image:
            if image.size != (360, 360):
                fail(f"{name}: expected 360x360 canvas, found {image.size}", failures)
            if "A" not in image.getbands():
                fail(f"{name}: missing alpha channel", failures)
                continue

            alpha = image.getchannel("A")
            corners = [alpha.getpixel(point) for point in ((0, 0), (359, 0), (0, 359), (359, 359))]
            if any(corners):
                fail(f"{name}: canvas corners must be fully transparent", failures)

            bbox = alpha.getbbox()
            if bbox is None:
                fail(f"{name}: subject is fully transparent", failures)
                continue

            left, top, right, bottom = bbox
            if left < 35 or top < 35 or right > 325 or bottom > 325:
                fail(f"{name}: subject lacks the required transparent padding: {bbox}", failures)

            if name in ROUND_BEADS:
                width, height = right - left, bottom - top
                if not (225 <= width <= 240 and 220 <= height <= 240):
                    fail(f"{name}: round bead is not normalized to the shared scale: {bbox}", failures)
                if bottom > 300:
                    fail(f"{name}: pixels below the bead suggest a baked floor reflection: {bbox}", failures)

    if failures:
        print("Stone asset verification failed:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print(f"Verified {len(EXPECTED)} stone assets: alpha, padding, scale, and reflection bounds pass.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
