#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ! "$1" =~ ^[A-Za-z0-9-]+$ ]]; then
  echo "usage: scripts/rollback.sh <explicit-wrangler-deployment-id>" >&2
  exit 2
fi

: "${REACH_PUBLIC_ORIGIN:?REACH_PUBLIC_ORIGIN is required}"
: "${REACH_MCP_URL:?REACH_MCP_URL is required}"
: "${REACH_TEST_TOKEN:?REACH_TEST_TOKEN is required}"

npx wrangler rollback "$1"
curl --fail --silent --show-error "${REACH_PUBLIC_ORIGIN}/version"
node scripts/smoke-production.mjs
