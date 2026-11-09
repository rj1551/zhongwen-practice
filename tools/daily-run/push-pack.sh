#!/usr/bin/env bash
# Daily run, last step: commit and push ONLY packs/ changes in zhongwen-data, after the pack check passes.
# Refuses if anything else in the repo changed, if the remote isn't rj1551/zhongwen-data, or if the check fails.
# Usage: tools/daily-run/push-pack.sh <data dir> "<commit message>" [packs/<id>.json]
set -euo pipefail
DATA="${1:?data dir}"; MSG="${2:?commit message}"; PACK="${3:-}"
HERE="$(cd "$(dirname "$0")" && pwd)"
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
