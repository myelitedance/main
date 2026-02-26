#!/usr/bin/env bash
set -euo pipefail

SKIP_TESTS=false
TASK=""
STRICT_CLEAN=false
START_ONLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-tests) SKIP_TESTS=true; shift ;;
    --task) TASK="${2:-}"; shift 2 ;;
    --strict-clean) STRICT_CLEAN=true; shift ;;
    --start-only) START_ONLY=true; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

fail() { echo "FAIL: $*" >&2; exit 1; }

command -v git >/dev/null 2>&1 || fail "git is required"
command -v npm >/dev/null 2>&1 || fail "npm is required"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "Run inside a git repo"

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

BRANCH="$(git branch --show-current)"
[[ -n "$BRANCH" ]] || fail "Could not detect branch"
[[ "$BRANCH" != "main" ]] || fail "You are on main. Create a feature branch first."

WORKTREE_DIRTY=false
if [[ -n "$(git status --porcelain)" ]]; then
  WORKTREE_DIRTY=true
  if [[ "$STRICT_CLEAN" == true ]]; then
    fail "Working tree is not clean (--strict-clean enabled)"
  fi
fi

LOG_DIR="$REPO_ROOT/.codex_logs"
mkdir -p "$LOG_DIR"
SESSIONS_DIR="$LOG_DIR/sessions"
mkdir -p "$SESSIONS_DIR"

START_EPOCH="$(date +%s)"
START_ISO="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
START_SHA="$(git rev-parse HEAD)"
SESSION_ID="$(date +"%Y%m%d-%H%M%S")"

ACTIVE_FILE="$LOG_DIR/active_session.env"
WORKLOG_FILE="$LOG_DIR/worklog.md"
WORKLOG_CSV="$LOG_DIR/worklog.csv"
SESSION_FILE="$SESSIONS_DIR/${SESSION_ID}.env"

cat > "$ACTIVE_FILE" <<EOF
SESSION_ID="$SESSION_ID"
START_EPOCH="$START_EPOCH"
START_ISO="$START_ISO"
START_SHA="$START_SHA"
BRANCH="$BRANCH"
TASK="$TASK"
WORKTREE_DIRTY="$WORKTREE_DIRTY"
EOF

cp "$ACTIVE_FILE" "$SESSION_FILE"

if [[ ! -f "$WORKLOG_FILE" ]]; then
  cat > "$WORKLOG_FILE" <<EOF
# Work Log

EOF
fi

if [[ ! -f "$WORKLOG_CSV" ]]; then
  echo "session_id,task,branch,start_utc,end_utc,duration_seconds,duration_hours,start_sha,end_sha,notes,diff_summary,commit_count" > "$WORKLOG_CSV"
fi

echo "Preflight started"
echo "Repo: $REPO_ROOT"
echo "Branch: $BRANCH"
echo "Start: $START_ISO"
[[ -n "$TASK" ]] && echo "Task: $TASK"
if [[ "$WORKTREE_DIRTY" == true ]]; then
  echo "Warning: working tree is dirty (timing still started)"
fi

if [[ "$START_ONLY" == true ]]; then
  echo "Start-only mode: skipping typecheck/tests/build"
  echo "Session active: $SESSION_ID"
  echo "When done, run: ./scripts/postflight.sh --notes \"what you completed\""
  exit 0
fi

echo "+ npm run typecheck"
npm run typecheck

if [[ "$SKIP_TESTS" == false ]]; then
  echo "+ npm test"
  npm test
else
  echo "Skipping tests (--skip-tests)"
fi

echo "+ npm run build"
npm run build

echo "Preflight passed. Session active: $SESSION_ID"
echo "When done, run: ./scripts/postflight.sh --notes \"what you completed\""
