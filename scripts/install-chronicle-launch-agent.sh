#!/bin/bash
set -euo pipefail

LABEL="com.chronicle.local-lan"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$HOME/Library/Logs/Chronicle"
SOURCE_DIR="/Users/chris/Desktop/CODE/chronicle"
SERVICE_ROOT="$HOME/Library/Application Support/ChronicleService"
SERVICE_APP_DIR="$SERVICE_ROOT/app"
RUN_SCRIPT="$SERVICE_ROOT/run-chronicle-lan.sh"
USER_ID="$(id -u)"

mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR" "$SERVICE_ROOT"

rsync -a --delete \
  --exclude "/dist" \
  --exclude "/test-results" \
  --exclude ".DS_Store" \
  "$SOURCE_DIR/" "$SERVICE_APP_DIR/"

cat > "$RUN_SCRIPT" <<RUNNER
#!/bin/bash
set -euo pipefail

cd "$SERVICE_APP_DIR"
exec /usr/local/bin/npm run serve:lan
RUNNER

chmod +x "$RUN_SCRIPT"

cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>$LABEL</string>
    <key>ProgramArguments</key>
    <array>
      <string>/bin/bash</string>
      <string>$RUN_SCRIPT</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$SERVICE_APP_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/chronicle-lan.stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/chronicle-lan.stderr.log</string>
    <key>EnvironmentVariables</key>
    <dict>
      <key>PATH</key>
      <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
  </dict>
</plist>
PLIST

if launchctl print "gui/$USER_ID/$LABEL" >/dev/null 2>&1; then
  launchctl bootout "gui/$USER_ID" "$PLIST_PATH" || true
fi

EXISTING_PID="$(lsof -ti tcp:5174 -sTCP:LISTEN || true)"
if [ -n "$EXISTING_PID" ]; then
  kill "$EXISTING_PID" || true
  sleep 1
fi

launchctl bootstrap "gui/$USER_ID" "$PLIST_PATH"
launchctl kickstart -k "gui/$USER_ID/$LABEL"

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"

echo "Installed and started $LABEL"
if [ -n "$LAN_IP" ]; then
  echo "Chronicle LAN URL: http://$LAN_IP:5174/"
else
  echo "Chronicle LAN URL: http://localhost:5174/"
fi
