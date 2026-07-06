#!/bin/bash
set -euo pipefail

REPO_DIR="/Users/chris/Desktop/CODE/CODE/chronicle"

cd "$REPO_DIR"
exec /usr/local/bin/npm run start
