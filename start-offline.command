#!/usr/bin/env bash
cd -- "$(dirname "$0")"
echo "=================================================="
echo " Ronde Sticker A4 Generator - Lokaal & Offline"
echo "=================================================="
echo "De applicatie wordt gestart op http://localhost:3000..."

# Controleer of Node.js aanwezig is
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "Fout: Node.js is niet gevonden op dit systeem."
  echo "Download Node.js gratis vanaf: https://nodejs.org"
  read -p "Druk op Enter om af te sluiten..."
  exit 1
fi

# Open de browser na 1.5 seconde
(sleep 1.5 && open "http://localhost:3000") &

# Start dev server
npm run dev
