#!/bin/bash
# macOS notification when Claude is waiting for user input

INPUT=$(cat)
MESSAGE=$(echo "$INPUT" | jq -r '.message // "Claude 需要你的確認"' 2>/dev/null || echo "Claude 需要你的確認")

osascript -e "display notification \"${MESSAGE}\" with title \"Claude Code\" sound name \"Ping\"" 2>/dev/null
exit 0
