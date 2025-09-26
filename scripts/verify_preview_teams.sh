#!/usr/bin/env bash
set -euo pipefail

OUT="scripts/verify_preview_teams.out"
: > "$OUT"

log(){ echo "$@" | tee -a "$OUT"; }

BASE_URL="${BASE_URL:-https://ra1dashboard-git-preview-teams-multi-crea-8db777-kevin-houstons-projects.vercel.app}"
TS=$(date +%s)
NAMEA="E2E Team A $TS"; NAMEB="E2E Team B $TS"
DATAA=$(printf '{"name":"%s","description":"Team A e2e","color":"#ff5722"}' "$NAMEA")
DATAB=$(printf '{"name":"%s","description":"Team B e2e","color":"#3f51b5"}' "$NAMEB")

# Create A
CODEA=$(curl -s -o a.json -w "%{http_code}" -X POST "$BASE_URL/api/teams" -H "content-type: application/json" -d "$DATAA")
# Create B
CODEB=$(curl -s -o b.json -w "%{http_code}" -X POST "$BASE_URL/api/teams" -H "content-type: application/json" -d "$DATAB")

log "HTTP: A=$CODEA B=$CODEB"

# Extract ids
IDA=$(sed -n 's/.*"_id":"\([^"]*\)".*/\1/p' a.json | head -n1)
IDB=$(sed -n 's/.*"_id":"\([^"]*\)".*/\1/p' b.json | head -n1)

log "IDs: A=$IDA B=$IDB"

# List
curl -s "$BASE_URL/api/teams" > list.json
HAS_A=NO_A; HAS_B=NO_B
if grep -Fq "$NAMEA" list.json; then HAS_A=HAS_A; fi
if grep -Fq "$NAMEB" list.json; then HAS_B=HAS_B; fi

log "List contains: $HAS_A $HAS_B"

# Cleanup
if [ -n "${IDA:-}" ]; then curl -s -X DELETE "$BASE_URL/api/teams?id=$IDA" >/dev/null || true; fi
if [ -n "${IDB:-}" ]; then curl -s -X DELETE "$BASE_URL/api/teams?id=$IDB" >/dev/null || true; fi

# Exit status logic
if [ "$CODEA" = "201" ] && [ "$CODEB" = "201" ] && [ "$HAS_A" = "HAS_A" ] && [ "$HAS_B" = "HAS_B" ]; then
  log "SUCCESS: Both teams created and listed."
  exit 0
else
  log "FAIL: Verification failed."
  exit 1
fi

