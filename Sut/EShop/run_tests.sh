#!/usr/bin/env bash
# run_all_tests.sh — run every consumer test suite, then provider verification,
# in sequence, from the Sut/EShop/ root.
#
# Usage: ./run_all_tests.sh
# Run this script FROM Sut/EShop/ (the folder containing backend/,
# frontend-web/, frontend-admin/).

set -uo pipefail

ROOT_DIR="$(pwd)"
FAIL=0
BASELINE_MISMATCH=0

if [[ -n "${BASH:-}" && "$BASH" == */* ]]; then
  PATH="${BASH%/*}:$PATH"
fi

if command -v npm.cmd >/dev/null 2>&1; then
  NPM_CMD="npm.cmd"
else
  NPM_CMD="npm"
fi

section() {
  echo ""
  echo "======================================================================"
  echo "  $1"
  echo "======================================================================"
}

run_step() {
  local label="$1"
  local dir="$2"
  local cmd="$3"

  section "$label"
  cd "$ROOT_DIR/$dir" || { echo "FAILED: could not cd into $dir"; FAIL=1; return 1; }

  if eval "$cmd"; then
    echo ""
    echo "PASSED: $label"
    return 0
  else
    echo ""
    echo "FAILED: $label"
    FAIL=1
    return 1
  fi
}

strip_ansi() {
  # Pact's verifier output contains ANSI highlighting; strip it before parsing.
  sed -E 's/\x1B\[[0-9;]*[[:alpha:]]//g'
}

consumer_total_from_summary() {
  local consumer="$1"
  local file="$2"

  sed -nE "s/^- ${consumer}: (passed|failed) \\(([0-9]+) interactions\\)$/\\2/p" "$file" | tail -n 1
}

consumer_failure_count() {
  local consumer="$1"
  local file="$2"

  awk -v consumer="$consumer" '
    $0 ~ "^[0-9]+\\) Verifying a pact between " consumer " and eshop-backend" {
      count++
    }
    END {
      print count + 0
    }
  ' "$file"
}

consumer_section_contains() {
  local consumer="$1"
  local needle="$2"
  local file="$3"

  awk -v consumer="$consumer" -v needle="$needle" '
    $0 ~ "^[0-9]+\\) Verifying a pact between " consumer " and eshop-backend" &&
      index($0, needle) {
      found = 1
    }
    END {
      exit found ? 0 : 1
    }
  ' "$file"
}

run_provider_verification() {
  local label="3/3 — backend provider verification (both consumers)"
  local output_file clean_file exit_code

  section "$label"
  cd "$ROOT_DIR/backend" || { echo "FAILED: could not cd into backend"; FAIL=1; return 1; }

  output_file="$(mktemp)"
  clean_file="$(mktemp)"

  set +e
  "$NPM_CMD" run pact:verify 2>&1 | tee "$output_file"
  exit_code=${PIPESTATUS[0]}

  strip_ansi < "$output_file" > "$clean_file"

  # Hardcoded rather than parsed from EShop_Pact_Plan.md for simplicity. Update
  # these four values manually whenever the documented Pact baseline changes.
  local expected_web_total=17
  local expected_web_failures=3
  local expected_admin_total=21
  local expected_admin_failures=1

  local web_total admin_total web_failures admin_failures
  web_total="$(consumer_total_from_summary "eshop-web" "$clean_file")"
  admin_total="$(consumer_total_from_summary "eshop-admin" "$clean_file")"
  web_failures="$(consumer_failure_count "eshop-web" "$clean_file")"
  admin_failures="$(consumer_failure_count "eshop-admin" "$clean_file")"

  if ! grep -q "Pact verification summary:" "$clean_file" ||
     [[ -z "$web_total" || -z "$admin_total" ]]; then
    echo ""
    echo "FAILED: $label"
    echo "Provider verification did not reach a parseable Pact summary."
    echo "$NPM_CMD run pact:verify exit code: $exit_code"
    FAIL=1
    rm -f "$output_file" "$clean_file"
    return 1
  fi

  local baseline_ok=1

  [[ "$web_total" == "$expected_web_total" ]] || baseline_ok=0
  [[ "$admin_total" == "$expected_admin_total" ]] || baseline_ok=0
  [[ "$web_failures" == "$expected_web_failures" ]] || baseline_ok=0
  [[ "$admin_failures" == "$expected_admin_failures" ]] || baseline_ok=0

  consumer_section_contains "eshop-web" "a checkout request" "$clean_file" || baseline_ok=0
  consumer_section_contains "eshop-web" "order created by web checkout" "$clean_file" || baseline_ok=0
  consumer_section_contains "eshop-web" "SAVE10" "$clean_file" || baseline_ok=0
  consumer_section_contains "eshop-admin" "canceled order 1 as delivered" "$clean_file" || baseline_ok=0

  echo ""
  echo "Parsed Pact provider baseline:"
  echo "- eshop-web: $((web_total - web_failures))/$web_total"
  echo "- eshop-admin: $((admin_total - admin_failures))/$admin_total"

  if [[ "$baseline_ok" -eq 1 ]]; then
    echo ""
    echo "PASSED: $label"
    echo "Provider verification reached the documented expected baseline."
    rm -f "$output_file" "$clean_file"
    return 0
  fi

  echo ""
  echo "BASELINE MISMATCH — investigate: $label"
  echo "Expected eshop-web: $((expected_web_total - expected_web_failures))/$expected_web_total"
  echo "Expected eshop-admin: $((expected_admin_total - expected_admin_failures))/$expected_admin_total"
  echo "Actual eshop-web: $((web_total - web_failures))/$web_total"
  echo "Actual eshop-admin: $((admin_total - admin_failures))/$admin_total"
  echo "$NPM_CMD run pact:verify exit code: $exit_code"
  BASELINE_MISMATCH=1
  rm -f "$output_file" "$clean_file"
  return 2
}

# Sanity check — must be run from Sut/EShop/, not some other directory.
if [[ ! -d "backend" || ! -d "frontend-web" || ! -d "frontend-admin" ]]; then
  echo "ERROR: this script must be run from Sut/EShop/ — expected to find"
  echo "backend/, frontend-web/, and frontend-admin/ in the current directory."
  echo "Current directory: $ROOT_DIR"
  exit 1
fi

echo "Running from: $ROOT_DIR"
echo "Using npm command: $NPM_CMD"

# 1. Consumer tests — frontend-web
if ! run_step "1/3 — frontend-web consumer tests (eshop-web)" "frontend-web" "\"$NPM_CMD\" run test:pact --runInBand"; then
  echo ""
  echo "Stopping — frontend-web's consumer tests failed. Provider verification"
  echo "would run against a stale or missing pact file, so it's skipped rather"
  echo "than giving a misleading result."
  exit 1
fi

# 2. Consumer tests — frontend-admin
if ! run_step "2/3 — frontend-admin consumer tests (eshop-admin)" "frontend-admin" "\"$NPM_CMD\" run test:pact --runInBand"; then
  echo ""
  echo "Stopping — frontend-admin's consumer tests failed. Provider verification"
  echo "would run against a stale or missing pact file, so it's skipped rather"
  echo "than giving a misleading result."
  exit 1
fi

# 3. Provider verification — verifies against both consumers' pact files.
# This step is expected to exit non-zero when the documented Pact baseline has
# known provider failures. Parse the verifier output instead of treating the
# raw exit code as the result.
run_provider_verification

cd "$ROOT_DIR"

section "SUMMARY"
if [[ "$FAIL" -eq 0 ]]; then
  if [[ "$BASELINE_MISMATCH" -eq 0 ]]; then
    echo "All steps completed. Provider verification matched the documented"
    echo "expected Pact baseline: 14/17 (eshop-web) and 20/21 (eshop-admin)."
  else
    echo "All steps ran, but provider verification did not match the documented"
    echo "Pact baseline. Treat this as BASELINE MISMATCH — investigate."
  fi
else
  echo "One or more steps failed to run at all — see the FAILED markers above."
  echo "This is distinct from Pact interactions failing verification (expected,"
  echo "per the documented baseline) — this means a step didn't execute cleanly."
fi

if [[ "$FAIL" -ne 0 ]]; then
  exit "$FAIL"
fi

exit "$BASELINE_MISMATCH"
