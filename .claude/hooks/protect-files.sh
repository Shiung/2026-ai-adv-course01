#!/bin/bash
# Block edits to sensitive/generated files

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE" ]; then
  exit 0
fi

BASENAME=$(basename "$FILE")

# Blocked patterns
BLOCKED=(
  ".env"
  "database.sqlite"
  "package-lock.json"
  "yarn.lock"
  "output.css"
)

for pattern in "${BLOCKED[@]}"; do
  if [[ "$BASENAME" == "$pattern" ]] || [[ "$FILE" == *"$pattern" ]]; then
    echo "BLOCKED: '$FILE' 是受保護的檔案，請手動編輯。" >&2
    exit 2
  fi
done

# Block *.sqlite wildcard
if [[ "$BASENAME" == *.sqlite ]]; then
  echo "BLOCKED: '$FILE' 是 SQLite 資料庫檔案，不得直接編輯。" >&2
  exit 2
fi

exit 0
