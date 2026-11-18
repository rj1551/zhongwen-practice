#!/bin/bash
# Runs every browser test against the built app (docs/) and prints one line per suite (v69).
#   tools/tests/run-all.sh                 build first (./build.sh), then test
#   tools/tests/run-all.sh --no-build      test docs/ exactly as committed (what GitHub Pages serves; CI does this)
#   tools/tests/run-all.sh gh.test.js ...  only these suites
# Needs node, python3 and Playwright (found as `playwright`, or set PLAYWRIGHT=/path/to/playwright). It makes its own
# copies of docs/ in a temp folder and starts the servers the suites expect, then stops them:
#   8765 clean copy (most suites, store) · 8767 copy whose GitHub URL points at keepalive's fake on 8766
#   8790 hangsrv.js on a copy with the https-only service-worker check removed (nosignal, nudge, update)
#   cache.test.js serves its own copy on 8791.
# Copies whose script text is patched get a fresh script-lock fingerprint (tools/csp.py), or the app wouldn't start.
# Exit code 0 only if every suite passed.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; REPO="$(cd "$HERE/../.." && pwd)"
BUILD=1; SUITES=()
for a in "$@"; do case "$a" in --no-build) BUILD=0 ;; *) SUITES+=("$a") ;; esac; done
[ ${#SUITES[@]} -eq 0 ] && SUITES=($(cd "$HERE" && ls *.test.js))
if [ -z "${PLAYWRIGHT:-}" ] && ! (cd "$HERE" && node -e 'require.resolve("playwright")' 2>/dev/null); then
  G="$(npm root -g 2>/dev/null)/playwright"; [ -d "$G" ] && export PLAYWRIGHT="$G"
fi
if [ $BUILD = 1 ]; then (cd "$REPO" && ./build.sh >/dev/null) || { echo "build failed"; exit 1; }; fi
T="$(mktemp -d)"; export TEST_SITE="$T/site" TEST_OUT="$T/out"; mkdir -p "$TEST_OUT"
cp -r "$REPO/docs" "$T/clean"; cp -r "$REPO/docs" "$T/site2"; cp -r "$REPO/docs" "$T/site"
sed -i 's|https://api.github.com/repos/|http://localhost:8766/repos/|g' "$T/site2/index.html"
python3 "$REPO/tools/csp.py" "$T/site2/index.html" --connect http://localhost:8766
sed -i 's/ \&\& location.protocol === "https:") {/) {/' "$T/site/index.html"
python3 "$REPO/tools/csp.py" "$T/site/index.html"
PIDS=()
cleanup() { for p in "${PIDS[@]}"; do kill "$p" 2>/dev/null; done; rm -rf "$T"; }
trap cleanup EXIT
python3 -m http.server 8765 -d "$T/clean" >"$T/h1.log" 2>&1 & PIDS+=($!)
python3 -m http.server 8767 -d "$T/site2" >"$T/h2.log" 2>&1 & PIDS+=($!)
(cd "$HERE" && exec node hangsrv.js "$T/site" 8790) >"$T/h3.log" 2>&1 & PIDS+=($!)
for i in $(seq 50); do curl -s -o /dev/null localhost:8765/ && curl -s -o /dev/null localhost:8767/ && curl -s -o /dev/null localhost:8790/ && break; sleep 0.2; done
FAILED=(); TOTAL=0
for t in "${SUITES[@]}"; do
  START=$(date +%s)
  out=$(cd "$HERE" && timeout 600 node "$t" 2>&1); rc=$?
  [ -n "${KEEP_LOG:-}" ] && printf "%s\n" "$out" > "$KEEP_LOG/$t.log"
  p=$(grep -c '^PASS' <<<"$out"); f=$(grep -c '^FAIL' <<<"$out")
  # keepalive prints a report rather than PASS lines; it fails by exit code / ERROR
  if [ $rc = 0 ] && [ "$f" = 0 ] && ! grep -q '^ERROR' <<<"$out" && { [ "$p" -gt 0 ] || [ "$t" = keepalive.test.js ]; }; then s=ok; else s=FAILED; FAILED+=("$t"); fi
  TOTAL=$((TOTAL + p))
  printf '%-22s %-6s %3s passed  (%ss)\n' "$t" "$s" "$p" "$(( $(date +%s) - START ))"
  [ $s = FAILED ] && grep -E '^(FAIL|ERROR)|Error' <<<"$out" | head -12 | sed 's/^/    /'
done
echo "----"
if [ ${#FAILED[@]} -eq 0 ]; then echo "ALL ${#SUITES[@]} SUITES PASSED ($TOTAL checks)"; exit 0; fi
echo "FAILED: ${FAILED[*]}"; exit 1
