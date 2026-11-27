# v113: makes data/fonts/NotoSerifSC-trad-{500,700}.woff — the traditional forms (data/zhconv.txt, s2t) of the
# characters in NotoSerifSC-500.woff that it doesn't have. Needs fontTools and the source font:
#   python3 tools/mkfonts-trad.py "path/to/NotoSerifSC[wght].ttf"   (google/fonts ofl/notoserifsc)
import sys, os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset
repo = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
src = sys.argv[1]
cur = set(TTFont(os.path.join(repo, "data/fonts/NotoSerifSC-500.woff")).getBestCmap())
s2t, sec = {}, None
for l in open(os.path.join(repo, "data/zhconv.txt"), encoding="utf8"):
    l = l.rstrip("\n")
    if l.startswith("## "): sec = l[3:]; continue
    if l.startswith("#") or not l: continue
    a, b = l.split("\t")[:2]
    if sec == "s2t" and len(a) == 1: s2t.setdefault(ord(a), set()).update(ord(c) for c in b)
add = set().union(*(s2t.get(c, set()) for c in cur)) - cur
print(len(add), "traditional characters")
for w in (500, 700):
    f = instancer.instantiateVariableFont(TTFont(src), {"wght": w}, updateFontNames=False)
    o = subset.Options(); o.layout_features = ["*"]; o.flavor = "woff"; o.name_IDs = ["*"]; o.name_languages = ["*"]; o.notdef_outline = True
    s = subset.Subsetter(o); s.populate(unicodes=add); s.subset(f); f.flavor = "woff"
    f.save(os.path.join(repo, f"data/fonts/NotoSerifSC-trad-{w}.woff"))
