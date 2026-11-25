# Fonts shipped with the app (v112)

So the app has its fonts offline from the first start (before v112 they came from Google Fonts and were missing offline).

- `NotoSerifSC-500.woff`, `NotoSerifSC-700.woff`: Noto Serif SC (google/fonts `ofl/notoserifsc/NotoSerifSC[wght].ttf`), instanced at weight 500 / 700 and cut down to GB2312 (6,763 characters) + every Han character in `data/content.json`, `words.json`, `slang.json` + punctuation and Latin; WOFF (zlib). Characters outside the set fall back to the phone's own serif font.
- `Figtree.woff`: Figtree (google/fonts `ofl/figtree/Figtree[wght].ttf`), the variable font (400–700) cut down to Latin.
- Licence: SIL Open Font License 1.1 (`OFL-NotoSerifSC.txt`, `OFL-Figtree.txt`).
- Made with fontTools (`varLib.instancer`, `subset`); to remake with more characters, see the commit that added them (v112).
