#!/usr/bin/env bash
set -euo pipefail

cd /var/www/autolife

ZIP_FILE="$(ls -t *.zip 2>/dev/null | head -n 1 || true)"

if [ -n "$ZIP_FILE" ]; then
  echo "==> Descompactando $ZIP_FILE por cima (preservando .env)..."
  if ! command -v unzip >/dev/null 2>&1; then
    apt-get update -qq && apt-get install -y -qq unzip
  fi
  unzip -o -q "$ZIP_FILE" -x ".env"
  rm -f "$ZIP_FILE"
elif [ -d .git ]; then
  echo "==> Puxando ultima versao do GitHub..."
  git pull --ff-only
fi

echo "==> Atualizando dependencias..."
npm install --no-audit --no-fund

echo "==> Gerando build de producao..."
npm run build

echo "==> Reiniciando aplicacao no PM2..."
pm2 restart autolife 2>/dev/null || pm2 restart autolife-world 2>/dev/null || pm2 restart all

echo "==> Pronto! AutoLife atualizado e no ar."
