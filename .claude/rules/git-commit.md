# Git Commit 規則

## Commit Message 格式

```
<type>: <簡短描述>

[選填：說明 why 或特殊情況]
```

## Type 類型

| type | 使用時機 |
|------|----------|
| `feat` | 新增功能 |
| `fix` | 修復 bug |
| `refactor` | 重構（不改功能、不修 bug） |
| `test` | 新增或修改測試 |
| `docs` | 文件變更（README、CHANGELOG 等） |
| `style` | 格式調整（不影響邏輯） |
| `chore` | 建置工具、依賴更新等雜項 |

## 範例

```
feat: 新增訂單付款模擬 API
fix: 修正購物車累加數量未檢查庫存上限
docs: 補充 ARCHITECTURE.md 雙模式認證說明
test: 新增 adminOrders 後台訂單測試
```

## 禁止 commit 的檔案

- `.env`（含敏感金鑰）
- `database.sqlite`（已在 .gitignore）
- `public/css/output.css`（自動產生）
- `node_modules/`

## 分支策略

- `main`：穩定版本，不直接推送
- `feature/<feature-name>`：功能開發
- `fix/<bug-name>`：修復
- PR 合併前需通過 `npm test`
