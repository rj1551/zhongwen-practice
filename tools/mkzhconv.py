# Builds data/zhconv.txt (simplified <-> traditional for the 简体 / 繁體 toggle in 听) from OpenCC's dictionaries
# (https://github.com/BYVoid/OpenCC, Apache-2.0, data/dictionary; not stored here).
# Usage: python3 tools/mkzhconv.py <OpenCC>/data/dictionary data/zhconv.txt
# Two blocks, "## s2t" then "## t2s", each "from<TAB>to" per line. The app does longest phrase first, then characters.
#  s2t = OpenCC s2tw without vocabulary swaps: standard traditional, then Taiwan character forms (為 裡 著 麵), which
#        is what most Mandopop KTV screens show (软件 stays 軟件, not 軟體).
#  t2s = OpenCC tw2s: Taiwan forms back to standard traditional (keeping 著名 etc.), then simplified; accepts
#        Taiwan, Hong Kong or OpenCC-style traditional.
# Only phrases whose result differs from converting character by character are kept, and only same-length ones
# (so the app can line converted text up with the original, character for character).
import sys, os
src, out = sys.argv[1], sys.argv[2]
def read(name, first=True):
    m = {}
    for line in open(os.path.join(src, name), encoding="utf-8"):
        if not line.strip() or line.startswith("#") or "\t" not in line: continue
        k, v = line.rstrip("\n").split("\t", 1); v = v.split()
        if k and v: m[k] = v[0]
    return m
def conv(s, phrases, chars):
    i, o, mx = 0, [], max([len(k) for k in phrases] + [1])
    while i < len(s):
        for n in range(min(mx, len(s) - i), 1, -1):
            if s[i:i + n] in phrases: o.append(phrases[s[i:i + n]]); i += n; break
        else: o.append(chars.get(s[i], s[i])); i += 1
    return "".join(o)
stc, stp, tw = read("STCharacters.txt"), read("STPhrases.txt"), read("TWVariants.txt")
tsc, tsp, twrp = read("TSCharacters.txt"), read("TSPhrases.txt"), read("TWVariantsRevPhrases.txt")
twrev = {v: k for k, v in tw.items() if k != v}
# s2t
twv = lambda s: "".join(tw.get(c, c) for c in s)
s2t_c = {k: twv(v) for k, v in stc.items() if len(k) == 1}
for k, v in tw.items(): s2t_c.setdefault(k, v)  # 着 -> 著 (OpenCC keeps 着 in standard traditional)
s2t_full = lambda s: twv(conv(s, stp, {k: v for k, v in stc.items()}))
s2t_p = {k: s2t_full(k) for k in stp if len(k) > 1}
# t2s
t2s_full = lambda s: conv(conv(s, twrp, twrev), tsp, tsc)
t2s_c = {}
for c in set(tsc) | set(twrev):
    if len(c) == 1: t2s_c[c] = t2s_full(c)
t2s_p = {k: t2s_full(k) for k in set(tsp) | set(twrp) if len(k) > 1}
def block(chars, phrases):
    cc = lambda s: "".join(chars.get(c, c) for c in s)
    a = [f"{k}\t{v}" for k, v in sorted(chars.items()) if k != v and len(v) == 1]
    b = [f"{k}\t{v}" for k, v in sorted(phrases.items()) if len(v) == len(k) and cc(k) != v]
    return a, b
a1, b1 = block(s2t_c, s2t_p); a2, b2 = block(t2s_c, t2s_p)
with open(out, "w", encoding="utf-8") as f:
    f.write("# simplified <-> traditional, from OpenCC (Apache-2.0) via tools/mkzhconv.py\n## s2t\n")
    f.write("\n".join(a1 + b1) + "\n## t2s\n" + "\n".join(a2 + b2) + "\n")
print(f"s2t {len(a1)} chars {len(b1)} phrases; t2s {len(a2)} chars {len(b2)} phrases")
