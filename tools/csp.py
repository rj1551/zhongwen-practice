#!/usr/bin/env python3
"""Script lock for the built page (v69): writes a Content-Security-Policy <meta> into an HTML file that lets the
browser run only the page's own <script> block, identified by its SHA-256 fingerprint.

    python3 tools/csp.py docs/index.html                      # build.sh does this
    python3 tools/csp.py site/index.html --connect http://localhost:8766   # a test copy that talks to a local fake

Run it again after ANY change to the script text (tests that patch the page do): a stale fingerprint means the
browser refuses the script and the app doesn't start. The page must hold exactly one <script> block and no inline
event handlers (onclick="…" etc.), which the policy would block.

Why each part is there:
  script-src 'sha256-…'   only the app's own code runs; injected <script>, onerror=…, javascript: links don't;
                          no eval / new Function (not used by the app)
  worker-src 'self'       the offline copy's service worker (sw.js)
  connect-src 'self' https:  GitHub, Gemini/Groq/any OpenAI-compatible base the learner sets, R2, LRCLIB
  media-src / img-src     audio and images from this site or from files on the device (blob:), data: icons
  style-src / font-src    inline styles + Google Fonts
  object-src, base-uri, form-action, frame-src 'none'   nothing the app uses; closes the other ways in
"""
import base64, hashlib, re, sys

def policy(script, extra_connect=()):
    h = base64.b64encode(hashlib.sha256(script.encode("utf-8")).digest()).decode()
    return "; ".join([
        "default-src 'self'",
        f"script-src 'sha256-{h}'",
        "worker-src 'self'",
        "connect-src " + " ".join(["'self'", "https:", *extra_connect]),
        "media-src 'self' blob:",
        "img-src 'self' data: blob:",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src https://fonts.gstatic.com",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
        "frame-src 'none'",
    ])

def lock(path, extra_connect=()):
    html = open(path, encoding="utf-8").read()
    blocks = re.findall(r"<script>(.*?)</script>", html, flags=re.S)
    if len(blocks) != 1 or "<script " in html:
        sys.exit(f"csp.py: expected exactly one plain <script> block in {path}, found {len(blocks)}")
    if re.search(r"<[a-z][^>]*\son[a-z]+=", html.split("<script>")[0], flags=re.I):
        sys.exit(f"csp.py: inline event handler (on…=) in the markup of {path}: the policy would block it")
    meta = f'<meta http-equiv="Content-Security-Policy" content="{policy(blocks[0], extra_connect)}">'
    html, n = re.subn(r'<meta http-equiv="Content-Security-Policy" content="[^"]*">', meta, html)
    if n == 0:
        if '<meta charset="utf-8">' not in html: sys.exit(f"csp.py: no <meta charset> in {path} to put the policy after")
        html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">' + meta, 1)
    open(path, "w", encoding="utf-8").write(html)

if __name__ == "__main__":
    args = sys.argv[1:]
    extra = []
    while "--connect" in args:
        i = args.index("--connect"); extra.append(args[i + 1]); del args[i:i + 2]
    if len(args) != 1: sys.exit(__doc__)
    lock(args[0], extra)
