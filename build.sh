#!/bin/sh
# Builds the standalone GitHub Pages copy in docs/ (full HTML skeleton; the Claude artifact adds its own).
set -e
cd "$(dirname "$0")"
mkdir -p docs/data
{
  printf '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  printf '<meta name="apple-mobile-web-app-capable" content="yes"><link rel="apple-touch-icon" href="icon-180.png">'
  printf '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%%}</style></head><body>\n'
  # stamp the version (sw.js CACHE) and build time, shown at the bottom of Progress so it's clear which version is running
  VER="$(sed -n 's/^const CACHE = "\(.*\)";/\1/p' sw.js)"; WHEN="$(TZ=America/New_York date '+%-m/%-d %H:%M')"
  sed "s|__APP_VERSION__|$VER · $WHEN|" index.html
  printf '\n</body></html>\n'
} > docs/index.html
cp data/words.json data/content.json data/cedict.txt data/CEDICT-LICENSE.txt data/zhconv.txt data/OPENCC-LICENSE.txt docs/data/
cp manifest.json sw.js icon-192.png icon-512.png icon-180.png docs/
touch docs/.nojekyll
echo built
