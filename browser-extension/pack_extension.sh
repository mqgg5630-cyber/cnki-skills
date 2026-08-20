#!/bin/bash
# Pack the Chrome Extension into a zip file for distribution
# Run from the browser-extension directory

cd "$(dirname "$0")"

VERSION=$(grep '"version"' manifest.json | sed 's/.*"\([0-9.]*\)".*/\1/')
OUTFILE="cnki-scholar-assistant-v${VERSION}.zip"

echo "📦 Packing CNKI Scholar Assistant v${VERSION}..."

zip -r "../${OUTFILE}" . \
  --exclude "*.sh" \
  --exclude "*.md" \
  --exclude ".DS_Store" \
  --exclude "__pycache__/*"

echo "✅ Done: ../${OUTFILE}"
echo "   Install: Chrome > chrome://extensions > Developer mode > Load unpacked OR drag zip"
