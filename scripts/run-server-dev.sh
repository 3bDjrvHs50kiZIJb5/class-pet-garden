#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash scripts/ensure-npm-deps.sh
bash scripts/ensure-dev-database.sh
# shellcheck source=scripts/dev-env.sh
source scripts/dev-env.sh

exec node --watch server/index.js