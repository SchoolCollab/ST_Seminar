#!/usr/bin/env bash
# reset-db.sh — resets the EShop dev database (backend/database.sqlite) to its
# seeded baseline via the dev-only /_dev/reset-db endpoint, without needing to
# restart the backend server process.
#
# Usage: ./reset-db.sh [base_url]
#   base_url defaults to http://localhost:3000

set -uo pipefail

BASE_URL="${1:-http://localhost:3000}"

response=$(curl -s -w '\n%{http_code}' -X POST "$BASE_URL/_dev/reset-db")
body=$(echo "$response" | head -n -1)
status=$(echo "$response" | tail -n 1)

if [[ "$status" == "200" ]]; then
    echo "Database reset OK: $body"
else
    echo "Database reset FAILED (HTTP $status): $body" >&2
    echo "Is the backend running (npm start / run_servers.sh)? Is NODE_ENV=production set (this endpoint is disabled in production)?" >&2
    exit 1
fi
