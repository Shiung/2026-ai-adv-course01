#!/bin/bash
# PreToolUse hook: block editing sensitive files

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except:
    print('')
" 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

BASENAME=$(basename "$FILE_PATH")

PROTECTED_PATTERNS=(
  "^\.env$"
  "^\.env\."
  "package-lock\.json$"
  "yarn\.lock$"
  "\.sqlite$"
  "\.sqlite3$"
  "\.db$"
)

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if echo "$BASENAME" | grep -qE "$pattern"; then
    echo "{\"decision\": \"block\", \"reason\": \"敏感檔案保護：禁止 AI 直接編輯 $BASENAME。如需修改，請手動操作。\"}"
    exit 2
  fi
done

exit 0
