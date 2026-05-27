#!/bin/bash
set -euo pipefail

LABEL="com.chronicle.local-lan"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"
SERVICE_ROOT="$HOME/Library/Application Support/ChronicleService"
USER_ID="$(id -u)"

if launchctl print "gui/$USER_ID/$LABEL" >/dev/null 2>&1; then
  launchctl bootout "gui/$USER_ID" "$PLIST_PATH" || true
fi

rm -f "$PLIST_PATH"
rm -f "$SERVICE_ROOT/run-chronicle-lan.sh"

echo "Removed $LABEL"
