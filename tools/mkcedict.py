import re, sys, collections
MARKS = {'a': 'āáǎà', 'e': 'ēéěè', 'i': 'īíǐì', 'o': 'ōóǒò', 'u': 'ūúǔù', 'ü': 'ǖǘǚǜ'}
def syl(s):
    m = re.match(r'^([A-Za-zü:]+?)([1-5])$', s)
    if not m: return s.replace('u:', 'ü')
    base, t = m.group(1).replace('u:', 'ü').replace('U:', 'Ü'), int(m.group(2))
    if t == 5: return base
    low = base.lower()
    if 'a' in low: i = low.index('a')
    elif 'e' in low: i = low.index('e')
    elif 'ou' in low: i = low.index('o')
    else:
        i = max(low.rfind(v) for v in 'iouü')
        if i < 0: return base
    v = low[i]; mark = MARKS[v][t - 1]
    if base[i].isupper(): mark = mark.upper()
    return base[:i] + mark + base[i + 1:]
def pinyin(p):
    out = []
    for s in p.split():
        out.append(syl(s) if re.search(r'[1-5]$', s) else s)
    # join syllables like CEDICT-style dictionaries do: no spaces inside a word
    return ''.join(out).replace('·', ' ')
def clean(gl):
    keep = []
    for g in gl:
        g = re.sub(r'\s*\(Taiwan pr\. \[[^\]]*\]\)', '', g)
        g = re.sub(r'\[[a-zA-Z0-9: ]+\]', '', g)  # inline pinyin refs
        g = re.sub(r'^\(bound form\)\s*', '', g)
        g = g.replace('|', '/') if g.startswith('CL:') else g
        if g.startswith('CL:'): g = 'measure word: ' + re.sub(r'[^一-鿿,，]', '', g.split('/')[-1] if '/' in g else g[3:]).replace(',', '、')
        g = g.strip()
        if g and g not in keep: keep.append(g)
    s = '; '.join(keep)
    return s if len(s) <= 84 else s[:81].rsplit(';', 1)[0].rsplit(' ', 1)[0] + '…'
def weak(gl): return bool(re.match(r'(old |archaic )?variant of|used in |see |erhua variant|surname', gl))
D = collections.OrderedDict()
for line in open(sys.argv[1], encoding='utf-8'):
    if line.startswith('#'): continue
    m = re.match(r'^(\S+) (\S+) \[([^\]]*)\] /(.*)/\s*$', line)
    if not m: continue
    trad, simp, py, gl = m.groups()
    D.setdefault(simp, []).append((pinyin(py), clean(gl.split('/')), py[:1].isupper()))
lines = []
for w, ents in D.items():
    # merge same pinyin, order: common readings first, proper names and variant/see entries last
    merged = collections.OrderedDict()
    for py, gl, proper in ents:
        k = py
        if k in merged: merged[k] = (merged[k][0] + '; ' + gl if gl not in merged[k][0] else merged[k][0], merged[k][1] and proper)
        else: merged[k] = (gl, proper)
    items = sorted(merged.items(), key=lambda kv: (kv[1][1], weak(kv[1][0])))
    lines.append(w + '\t' + '\t'.join(py + '\t' + gl[0][:140] for py, gl in items))
open(sys.argv[2], 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print(len(lines))
