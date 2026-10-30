# Data generators

Run from this folder (`cd tools`). Each script reads/writes paths given on the command line.

| Script | Makes | Command |
|---|---|---|
| `content.py` (+ `v3content.py`, `sen.py`, which it `exec`s) | `data/content.json`: production drills, chunking, words in context, sentence parsing, passages, placement banks | `python3 content.py ../data/content.json` |
| `mkwords.py` | `data/words.json` from the learner's Anki history (`anki_words_all.json`: one row per Anki card with status tier) | `python3 mkwords.py anki_words_all.json ../data/words.json` |
| `mkcedict.py` | `data/cedict.txt` from CC-CEDICT (`cedict_ts.u8` from mdbg.net, not stored here) | `python3 mkcedict.py cedict_ts.u8 ../data/cedict.txt` |

Then run `../build.sh` to refresh `docs/` (the GitHub Pages copy).

`content.json` is also fine to edit by hand; if you do, update the scripts too or they'll overwrite your edit next time.
