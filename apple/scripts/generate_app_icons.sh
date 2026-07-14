#!/bin/sh

set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
asset_dir="$script_dir/../ChronicleApp/Assets.xcassets/AppIcon.appiconset"
canonical="$asset_dir/AppIcon-1024.png"

# The exact 1254x1254 JPEG selected by Chris on 2026-07-14.
approved_source_sha256="34a695b83578fa7298e90197546fbf378da8f059c545a7c900fe4cfb3a6a2f57"
canonical_sha256="9ec1544c3745d9749fc2bbe0a53c9a427e84d4353370a657d16d07e56bc0d010"

if [ "$#" -eq 2 ] && [ "$1" = "--source" ]; then
  source_image=$2
  source_sha256=$(shasum -a 256 "$source_image" | awk '{print $1}')
  if [ "$source_sha256" != "$approved_source_sha256" ]; then
    echo "Refusing unapproved source artwork: $source_sha256" >&2
    exit 1
  fi

  candidate=$(mktemp -t chronicle-app-icon).png
  trap 'rm -f "$candidate"' EXIT HUP INT TERM
  sips -s format png -z 1024 1024 "$source_image" --out "$candidate" >/dev/null
  candidate_sha256=$(shasum -a 256 "$candidate" | awk '{print $1}')
  if [ "$candidate_sha256" != "$canonical_sha256" ]; then
    echo "Canonical conversion differs from the approved Apple-tool output: $candidate_sha256" >&2
    exit 1
  fi
  cp "$candidate" "$canonical"
elif [ "$#" -ne 0 ]; then
  echo "Usage: $0 [--source /path/to/approved-artwork.jpg]" >&2
  exit 64
fi

actual_canonical_sha256=$(shasum -a 256 "$canonical" | awk '{print $1}')
if [ "$actual_canonical_sha256" != "$canonical_sha256" ]; then
  echo "Canonical artwork checksum mismatch: $actual_canonical_sha256" >&2
  exit 1
fi

while IFS='|' read -r filename pixels; do
  sips -z "$pixels" "$pixels" "$canonical" --out "$asset_dir/$filename" >/dev/null
done <<'SIZES'
AppIcon-iPhone-20@2x.png|40
AppIcon-iPhone-20@3x.png|60
AppIcon-iPhone-29@2x.png|58
AppIcon-iPhone-29@3x.png|87
AppIcon-iPhone-40@2x.png|80
AppIcon-iPhone-40@3x.png|120
AppIcon-iPhone-60@2x.png|120
AppIcon-iPhone-60@3x.png|180
AppIcon-iPad-20@1x.png|20
AppIcon-iPad-20@2x.png|40
AppIcon-iPad-29@1x.png|29
AppIcon-iPad-29@2x.png|58
AppIcon-iPad-40@1x.png|40
AppIcon-iPad-40@2x.png|80
AppIcon-iPad-76@1x.png|76
AppIcon-iPad-76@2x.png|152
AppIcon-iPad-83.5@2x.png|167
AppIcon-macOS-16@1x.png|16
AppIcon-macOS-16@2x.png|32
AppIcon-macOS-32@1x.png|32
AppIcon-macOS-32@2x.png|64
AppIcon-macOS-128@1x.png|128
AppIcon-macOS-128@2x.png|256
AppIcon-macOS-256@1x.png|256
AppIcon-macOS-256@2x.png|512
AppIcon-macOS-512@1x.png|512
AppIcon-macOS-512@2x.png|1024
SIZES

echo "Regenerated Chronicle AppIcon renditions from the approved canonical artwork."
