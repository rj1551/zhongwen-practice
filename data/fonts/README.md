# Fonts shipped with the app (v112; traditional forms added in v113)

So the app has its fonts offline from the first start (before v112 they came from Google Fonts and were missing offline).

- `NotoSerifSC-500.woff`, `NotoSerifSC-700.woff`: Noto Serif SC (google/fonts `ofl/notoserifsc/NotoSerifSC[wght].ttf`), instanced at weight 500 / 700 and cut down to GB2312 (6,763 characters) + every Han character in `data/content.json`, `words.json`, `slang.json` + punctuation and Latin; WOFF (zlib). Characters outside the set fall back to the phone's own serif font.
- `NotoSerifSC-trad-500.woff`, `NotoSerifSC-trad-700.woff` (v113): the same font, only the traditional forms (from `data/zhconv.txt`, s2t) of the characters in the files above that aren't in them already (2,287), so 繁 and books' 原文 aren't half in the phone's font. Own family `"Noto Serif SC T"`, listed right after `"Noto Serif SC"` in `--f-zh`; separate files so the simplified ones (already on phones) didn't change. Remake with `tools/mkfonts-trad.py`.
- `Figtree.woff`: Figtree (google/fonts `ofl/figtree/Figtree[wght].ttf`), the variable font (400–700) cut down to Latin.
- Licence: SIL Open Font License 1.1 (`OFL-NotoSerifSC.txt`, `OFL-Figtree.txt`).
- Made with fontTools (`varLib.instancer`, `subset`, `layout_features=['*']`); to remake with more characters, see the commit that added them (v112).
