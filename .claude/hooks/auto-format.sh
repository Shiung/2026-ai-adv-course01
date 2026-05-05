#!/bin/bash
# Auto-format after editing JS/EJS files
# Note: No eslint/prettier config detected. Add config to activate formatting.

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE" ]; then
  exit 0
fi

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Only act on JS files
if [[ "$FILE" != *.js ]]; then
  exit 0
fi

# Run eslint --fix if config exists
if [ -f "$PROJECT_ROOT/.eslintrc.js" ] || [ -f "$PROJECT_ROOT/.eslintrc.json" ] || [ -f "$PROJECT_ROOT/eslint.config.js" ]; then
  cd "$PROJECT_ROOT" && npx eslint --fix "$FILE" 2>/dev/null
  exit 0
fi

# Run prettier if config exists
if [ -f "$PROJECT_ROOT/.prettierrc" ] || [ -f "$PROJECT_ROOT/prettier.config.js" ]; then
  cd "$PROJECT_ROOT" && npx prettier --write "$FILE" 2>/dev/null
  exit 0
fi

# No formatter configured — no-op
exit 0
