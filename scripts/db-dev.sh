#!/usr/bin/env bash
# Toutes les opérations de schéma passent par ce script.
#
# Garde-fou : il refuse d'agir si le projet lié n'est pas la base de DEV.
# Un `supabase db push` lancé par erreur sur la production suffirait à
# casser tous les sites clients — c'est précisément ce qu'on veut éviter.
set -euo pipefail
cd "$(dirname "$0")/.."

# Lit uniquement SUPABASE_DEV_REF (pas tout le .env.local : sourcer un .env
# en bash casse dès qu'une valeur contient un espace ou un caractère spécial).
if [ -z "${SUPABASE_DEV_REF:-}" ] && [ -f .env.local ]; then
  SUPABASE_DEV_REF=$(grep -E '^SUPABASE_DEV_REF=' .env.local | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)
fi
: "${SUPABASE_DEV_REF:?Ajoute SUPABASE_DEV_REF=<référence du projet vwa-platform-dev> dans .env.local}"

REF_FILE="supabase/.temp/project-ref"
linked=$( [ -f "$REF_FILE" ] && cat "$REF_FILE" || echo "" )

ensure_dev() {
  if [ "$linked" != "$SUPABASE_DEV_REF" ]; then
    echo "✋ Projet lié : '${linked:-aucun}' — attendu : '$SUPABASE_DEV_REF' (dev)."
    echo "   Lance d'abord : npm run db:link"
    exit 1
  fi
}

case "${1:-}" in
  link)   supabase link --project-ref "$SUPABASE_DEV_REF" ;;
  new)    supabase migration new "${2:?Nom de la migration, ex : npm run db:new -- tenancy}" ;;
  push)   ensure_dev; supabase db push --linked ;;
  reset)  ensure_dev
          read -r -p "Réinitialiser la base de DEV ($SUPABASE_DEV_REF) et rejouer migrations + seed ? [oui/N] " ok
          [ "$ok" = "oui" ] && supabase db reset --linked || echo "Annulé." ;;
  types)  ensure_dev; supabase gen types typescript --linked > lib/database.v2.types.ts
          echo "→ lib/database.v2.types.ts" ;;
  status) echo "Projet lié : ${linked:-aucun} · dev attendu : $SUPABASE_DEV_REF"
          ensure_dev && supabase migration list --linked ;;
  *) echo "Usage : db-dev.sh {link|new <nom>|push|reset|types|status}"; exit 1 ;;
esac
