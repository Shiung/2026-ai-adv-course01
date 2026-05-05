#!/bin/bash
# macOS notification + sound when Claude finishes a task

osascript -e 'display notification "任務已完成" with title "Claude Code"' 2>/dev/null
afplay /System/Library/Sounds/Glass.aiff 2>/dev/null
exit 0
