#!/bin/bash
# PostToolUse hook: run tests after editing source or test files

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

# Only trigger for JS source and test files
if echo "$FILE_PATH" | grep -qE "(src/|tests/).*\.js$"; then
  PROJECT_ROOT=$(git -C "$(dirname "$FILE_PATH")" rev-parse --show-toplevel 2>/dev/null)
  if [ -z "$PROJECT_ROOT" ]; then
    exit 0
  fi
  echo "--- 自動執行測試 ---"
  cd "$PROJECT_ROOT" && npm test 2>&1
fi

exit 0
