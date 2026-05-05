#!/bin/bash
# Regenerate OpenAPI spec after editing route files

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE" ]; then
  exit 0
fi

# Only trigger for route files
if [[ "$FILE" != */src/routes/* ]]; then
  exit 0
fi

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
echo "路由檔已更新，重新產生 OpenAPI spec..."
cd "$PROJECT_ROOT" && node generate-openapi.js 2>&1
echo "OpenAPI spec 已更新。"
exit 0
