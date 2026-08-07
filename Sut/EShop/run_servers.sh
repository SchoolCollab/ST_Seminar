#!/bin/bash
# Kill stale node processes (portable: Git Bash on Windows has no killall)
if command -v taskkill >/dev/null 2>&1; then
    taskkill //F //IM node.exe 2>/dev/null || true
else
    pkill -f node 2>/dev/null || true
fi

# Each server in its own subshell so `cd` doesn't leak between lines.
# `npm audit` is advisory only — it exits non-zero on any finding, so it must
# never gate the server start. Use `;` not `&&` after it.
( cd ./backend       && npm install && { npm audit || true; } && node server.js ) &
( cd ./frontend-web  && npm install && { npm audit || true; } && npm run dev ) &
( cd ./frontend-admin && npm install && { npm audit || true; } && npm run dev ) &

wait
