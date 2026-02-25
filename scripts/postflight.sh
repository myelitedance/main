#!/usr/bin/env bash
set -euo pipefail

NOTES=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --notes) NOTES="${2:-}"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

fail() { echo "FAIL: $*" >&2; exit 1; }

csv_escape() {
  local s="${1:-}"
  s="${s//\"/\"\"}"
  printf '"%s"' "$s"
}

command -v git >/dev/null 2>&1 || fail "git is required"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "Run inside a git repo"

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

LOG_DIR="$REPO_ROOT/.codex_logs"
ACTIVE_FILE="$LOG_DIR/active_session.env"
WORKLOG_FILE="$LOG_DIR/worklog.md"
WORKLOG_CSV="$LOG_DIR/worklog.csv"

[[ -f "$ACTIVE_FILE" ]] || fail "No active session found. Run preflight first."
# shellcheck disable=SC1090
source "$ACTIVE_FILE"

END_EPOCH="$(date +%s)"
END_ISO="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
END_SHA="$(git rev-parse HEAD)"
ELAPSED_SEC="$((END_EPOCH - START_EPOCH))"

HOURS=$((ELAPSED_SEC / 3600))
MINUTES=$(((ELAPSED_SEC % 3600) / 60))
SECONDS=$((ELAPSED_SEC % 60))
DEC_HOURS="$(awk "BEGIN { printf \"%.2f\", $ELAPSED_SEC/3600 }")"

COMMITS="$(git log --oneline "${START_SHA}..${END_SHA}" || true)"
COMMIT_COUNT="$(git rev-list --count "${START_SHA}..${END_SHA}" || true)"
DIFFSTAT="$(git diff --shortstat "${START_SHA}..${END_SHA}" || true)"
STATUS="$(git status --short || true)"

{
  echo "## Session $SESSION_ID"
  echo "- Task: ${TASK:-N/A}"
  echo "- Branch: $BRANCH"
  echo "- Clock-in (UTC): $START_ISO"
  echo "- Clock-out (UTC): $END_ISO"
  echo "- Duration: ${HOURS}h ${MINUTES}m ${SECONDS}s (${DEC_HOURS} hours)"
  echo "- Start SHA: $START_SHA"
  echo "- End SHA: $END_SHA"
  echo "- Notes: ${NOTES:-N/A}"
  echo "- Diff summary: ${DIFFSTAT:-No committed diff between start/end SHAs}"
  echo "- Commits since clock-in:"
  if [[ -n "$COMMITS" ]]; then
    echo '```text'
    echo "$COMMITS"
    echo '```'
  else
    echo "  - none"
  fi
  echo "- Current working tree status:"
  if [[ -n "$STATUS" ]]; then
    echo '```text'
    echo "$STATUS"
    echo '```'
  else
    echo "  - clean"
  fi
  echo
} >> "$WORKLOG_FILE"

if [[ ! -f "$WORKLOG_CSV" ]]; then
  echo "session_id,task,branch,start_utc,end_utc,duration_seconds,duration_hours,start_sha,end_sha,notes,diff_summary,commit_count" > "$WORKLOG_CSV"
fi

{
  csv_escape "$SESSION_ID"; printf ","
  csv_escape "${TASK:-}"; printf ","
  csv_escape "$BRANCH"; printf ","
  csv_escape "$START_ISO"; printf ","
  csv_escape "$END_ISO"; printf ","
  csv_escape "$ELAPSED_SEC"; printf ","
  csv_escape "$DEC_HOURS"; printf ","
  csv_escape "$START_SHA"; printf ","
  csv_escape "$END_SHA"; printf ","
  csv_escape "${NOTES:-}"; printf ","
  csv_escape "${DIFFSTAT:-}"; printf ","
  csv_escape "${COMMIT_COUNT:-0}"
  printf "\n"
} >> "$WORKLOG_CSV"

rm -f "$ACTIVE_FILE"

echo "Postflight complete"
echo "Clock-out: $END_ISO"
echo "Total time: ${HOURS}h ${MINUTES}m ${SECONDS}s (${DEC_HOURS} hours)"
echo "Markdown log: $WORKLOG_FILE"
echo "CSV log: $WORKLOG_CSV"
