#!/bin/zsh

set -e

ROOT_DIR="/Users/frankkrumsdorf/Downloads/stitch/stitch"
APP_DIR="$ROOT_DIR/midnightshader-app"
# Nicht 5173: dort läuft oft schon eine andere Vite-App → sonst öffnet sich die falsche UI.
MIDNIGHT_VITE_PORT=5183

cd "$ROOT_DIR"

# Start static screens server (HTML previews)
if ! lsof -i :4173 >/dev/null 2>&1; then
  nohup python3 -m http.server 4173 >/tmp/midnightshader-static.log 2>&1 &
fi

# Install deps if needed
if [ ! -d "$APP_DIR/node_modules" ]; then
  cd "$APP_DIR"
  npm install
else
  cd "$APP_DIR"
fi

# MidnightShader Vite (Port siehe vite.config.ts)
if ! lsof -i :$MIDNIGHT_VITE_PORT >/dev/null 2>&1; then
  nohup npm run dev -- --host --port $MIDNIGHT_VITE_PORT >/tmp/midnightshader-react.log 2>&1 &
fi

# Warten bis Vite antwortet (statt festem sleep)
for i in {1..60}; do
  if curl -sf "http://127.0.0.1:$MIDNIGHT_VITE_PORT/" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done
open "http://localhost:$MIDNIGHT_VITE_PORT/"
