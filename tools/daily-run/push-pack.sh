#!/usr/bin/env bash
# Daily run, last step: commit and push ONLY packs/ changes in zhongwen-data, after the pack check passes.
# Refuses if anything else in the repo changed, if the remote isn't rj1551/zhongwen-data, or if the check fails.
# Usage: tools/daily-run/push-pack.sh <data dir> "<commit message>" [packs/<id>.json]
set -euo pipefail
# Paths may be absolute or relative to where you run it; a relative pack path may also be relative to the data dir
# (packs/<id>.json). Both are made absolute before the script moves into the data dir (2026-11-21: a relative
# pack path used to be looked up from inside the data dir and the push was refused).
DATA="${1:?data dir}"; MSG="${2:?commit message}"; PACK="${3:-}"
HERE="$(cd "$(dirname "$0")" && pwd)"
[ -d "$DATA" ] || { echo "REFUSED: data dir not found: $DATA"; exit 1; }
DATA="$(cd "$DATA" && pwd)"
if [ -n "$PACK" ]; then
  if [ -f "$PACK" ]; then PACK="$(cd "$(dirname "$PACK")" && pwd)/$(basename "$PACK")"
  elif [ -f "$DATA/$PACK" ]; then PACK="$DATA/$PACK"
  else echo "REFUSED: pack not found: $PACK (looked in $(pwd) and $DATA; nothing pushed)"; exit 1; fi
  case "$PACK" in "$DATA"/packs/*.json) ;; *) echo "REFUSED: pack is not under $DATA/packs/: $PACK"; exit 1;; esac
fi
cd "$DATA"
url="$(git remote get-url origin)"
case "$url" in */rj1551/zhongwen-data|*/rj1551/zhongwen-data.git) ;; *) echo "REFUSED: origin is $url, not rj1551/zhongwen-data"; exit 1;; esac
git add -A packs/
# every change (staged or not, tracked or not) must be under packs/ and be a .json file
bad="$(git status --porcelain --untracked-files=all | awk '{print $NF}' | grep -v -E '^packs/[A-Za-z0-9._-]+\.json$' || true)"
if [ -n "$bad" ]; then echo "REFUSED: changes outside packs/ (nothing pushed):"; echo "$bad"; exit 1; fi
if [ -z "$(git status --porcelain)" ]; then echo "nothing to push"; exit 0; fi
if [ -n "$PACK" ]; then node "$HERE/check-pack.js" "$PACK" --data "$DATA" || { echo "REFUSED: pack check failed"; exit 1; }; fi
git -c user.name="Claude daily run" -c user.email="noreply@anthropic.com" commit -q -m "$MSG"
for i in 1 2 3; do
  if git push -q origin HEAD; then echo "pushed: $MSG"; exit 0; fi
  git pull -q --rebase origin "$(git rev-parse --abbrev-ref HEAD)"
done
echo "push failed after 3 tries"; exit 1
