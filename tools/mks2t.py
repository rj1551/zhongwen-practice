# Builds data/s2t.txt (simplified -> traditional, for the karaoke 繁 toggle) from OpenCC's dictionaries
# (https://github.com/BYVoid/OpenCC, Apache-2.0): data/dictionary/STCharacters.txt, STPhrases.txt and TWVariants.txt.
# Like OpenCC's s2tw: standard traditional, then Taiwan character forms (為 裡 著 麵), which is what most Mandopop
# KTV screens show; no Taiwan vocabulary swaps (软件 stays 軟件, not 軟體).
# Usage: python3 tools/mks2t.py <OpenCC>/data/dictionary data/s2t.txt
# Output: one "simplified<TAB>traditional" per line. Single characters: OpenCC's first (most common) choice,
# only where it differs. Phrases: only those whose traditional form differs from converting character by
# character (the app does longest-phrase-first, then characters), which keeps the file small.
import sys, os

src, out = sys.argv[1], sys.argv[2]
def read(name):
    m = {}
    for line in open(os.path.join(src, name), encoding="utf-8"):
        if not line.strip() or line.startswith("#") or "\t" not in line: continue
        k, v = line.rstrip("\n").split("\t", 1)
        v = v.split()
        if k and v: m[k] = v[0]
    return m
chars = read("STCharacters.txt")
phrases = read("STPhrases.txt")
tw = read("TWVariants.txt")
twv = lambda s: "".join(tw.get(c, c) for c in s)
chars = {k: twv(v) for k, v in chars.items()}
for k, v in tw.items(): chars.setdefault(k, v)  # 着 → 著 (OpenCC keeps 着 in standard traditional)
phrases = {k: twv(v) for k, v in phrases.items()}
cc = lambda s: "".join(chars.get(c, c) for c in s)
lines = [f"{k}\t{v}" for k, v in sorted(chars.items()) if len(k) == 1 and k != v]
kept = [f"{k}\t{v}" for k, v in sorted(phrases.items()) if len(k) > 1 and cc(k) != v and len(k) == len(v)]
with open(out, "w", encoding="utf-8") as f:
    f.write("# simplified\ttraditional, from OpenCC (Apache-2.0) via tools/mks2t.py\n")
    f.write("\n".join(lines + kept) + "\n")
print(len(lines), "characters,", len(kept), "phrases")
