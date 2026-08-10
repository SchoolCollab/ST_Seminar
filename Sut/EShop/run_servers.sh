#!/bin/bash
# Kill stale node processes (portable: Git Bash on Windows has no killall)
if command -v taskkill >/dev/null 2>&1; then
    taskkill //F //IM node.exe 2>/dev/null || true
else
    pkill -f node 2>/dev/null || true
fi

# Each server in its own subshell so `cd` doesn't leak between lines.
# Use npm ci rather than npm install so starting the seminar app never rewrites
# package-lock.json. If dependencies change, update the lockfile deliberately
# with npm install in that package directory, then commit it.
# `npm audit` is advisory only — it exits non-zero on any finding, so it must
# never gate the server start. Use `;` not `&&` after it.
( cd ./backend       && npm ci && { npm audit || true; } && node server.js ) &
( cd ./frontend-web  && npm ci && { npm audit || true; } && npm run dev ) &
( cd ./frontend-admin && npm ci && { npm audit || true; } && npm run dev ) &

wait
