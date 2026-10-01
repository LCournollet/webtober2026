#!/usr/bin/env bash
# Usage : ./deploy.sh <theme>   -> envoie <theme>/ sur le VPS
#         ./deploy.sh           -> envoie la page d'accueil
set -euo pipefail
cd "$(dirname "$0")"
VPS="ubuntu@57.131.40.94"; KEY="$HOME/.ssh/palais_vps"; DEST="/var/www/devtober"
if [ $# -eq 0 ]; then
  scp -i "$KEY" index.html "$VPS:$DEST/"
  echo "→ https://devtober.57-131-40-94.sslip.io/"
else
  T="$1"; [ -d "$T" ] || { echo "$T introuvable"; exit 1; }
  ssh -i "$KEY" "$VPS" "rm -rf '$DEST/$T.tmp' && mkdir -p '$DEST/$T.tmp'"
  scp -i "$KEY" -r "$T/." "$VPS:$DEST/$T.tmp/"
  ssh -i "$KEY" "$VPS" "rm -rf '$DEST/$T' && mv '$DEST/$T.tmp' '$DEST/$T'"
  echo "→ https://devtober.57-131-40-94.sslip.io/$T/"
fi
