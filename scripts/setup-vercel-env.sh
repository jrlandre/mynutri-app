#!/bin/bash
# Uso: bash scripts/setup-vercel-env.sh
# Pré-requisito: vercel login

set -e

# Lê as variáveis do .env.local
source .env.local 2>/dev/null || { echo "Erro: .env.local não encontrado"; exit 1; }

PROJECT="mynutri-app"
ENVS=(production preview)

add_env() {
  local key=$1
  local value=$2
  for env in "${ENVS[@]}"; do
    echo "$value" | vercel env add "$key" "$env" --force 2>/dev/null || true
  done
  echo "✓ $key"
}

echo "Adicionando variáveis de ambiente ao Vercel ($PROJECT)..."
echo ""

add_env NEXT_PUBLIC_SUPABASE_URL          "$NEXT_PUBLIC_SUPABASE_URL"
add_env NEXT_PUBLIC_SUPABASE_ANON_KEY     "$NEXT_PUBLIC_SUPABASE_ANON_KEY"
add_env SUPABASE_SERVICE_ROLE_KEY         "$SUPABASE_SERVICE_ROLE_KEY"
add_env GOOGLE_AI_API_KEY                 "$GOOGLE_AI_API_KEY"
add_env MYNUTRI_SYSTEM_PROMPT             "$MYNUTRI_SYSTEM_PROMPT"
add_env NEXT_PUBLIC_APP_URL               "$NEXT_PUBLIC_APP_URL"
add_env KV_REST_API_URL                   "$KV_REST_API_URL"
add_env KV_REST_API_TOKEN                 "$KV_REST_API_TOKEN"
add_env KV_REST_API_READ_ONLY_TOKEN       "$KV_REST_API_READ_ONLY_TOKEN"
add_env KV_URL                            "$KV_URL"
add_env REDIS_URL                         "$REDIS_URL"

echo ""
echo "Pronto. Redeploy automático deve disparar."
