#!/bin/bash
set -euo pipefail

REPO_DIR="/Users/chris/Desktop/CODE/chronicle"

cd "$REPO_DIR"
exec /usr/local/bin/npm run serve:lan
