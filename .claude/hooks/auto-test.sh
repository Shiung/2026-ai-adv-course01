#!/bin/bash
# Run the corresponding test file after editing a route file

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE" ]; then
  exit 0
fi

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BASENAME=$(basename "$FILE" .js)

declare -A ROUTE_TO_TEST=(
  ["authRoutes"]="auth"
  ["productRoutes"]="products"
  ["cartRoutes"]="cart"
  ["orderRoutes"]="orders"
  ["adminProductRoutes"]="adminProducts"
  ["adminOrderRoutes"]="adminOrders"
)

TARGET_TEST="${ROUTE_TO_TEST[$BASENAME]}"

if [ -z "$TARGET_TEST" ]; then
  exit 0
fi

echo "路由已修改，執行對應測試：tests/${TARGET_TEST}.test.js"
cd "$PROJECT_ROOT" && npm test -- "tests/${TARGET_TEST}.test.js" 2>&1
exit 0
