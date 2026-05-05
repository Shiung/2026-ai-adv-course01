---
paths:
  - "src/database.js"
  - "src/routes/**"
---

# 資料庫規則

## 欄位命名
- DB 欄位統一用 snake_case（`product_id`、`created_at`、`recipient_name`）
- 主鍵欄位統一為 `id TEXT PRIMARY KEY`，值為 UUID v4（`uuidv4()`）
- 時間欄位用 `TEXT DEFAULT (datetime('now'))`（SQLite ISO 8601）

## SQL 安全
- 所有帶外部輸入的查詢必須用 prepared statement（`db.prepare(...).get/all/run`）
- 絕對禁止字串拼接 SQL（包括 template literal 拼 WHERE 條件）
- 唯一例外：動態欄位名稱（如 `owner.field`）需確保來源僅限受控值

## Transaction
- 多步驟資料操作必須用 `db.transaction(() => { ... })()`
- 訂單建立是標準案例：create order → create order_items → update stock → delete cart
- Transaction 內不得做 HTTP 請求或其他非同步操作（better-sqlite3 是同步 API）

## Schema 異動
- 新增 table 在 `initializeDatabase()` 的 `db.exec()` 中加入 `CREATE TABLE IF NOT EXISTS`
- 修改現有 table 需考慮是否影響現有 DB 檔案（SQLite 無 migration tool，需手動處理）
- 外鍵已全域啟用（`PRAGMA foreign_keys = ON`），新 table 若有關聯需加 `FOREIGN KEY`

## 資料快照
- 訂單明細（order_items）儲存商品名稱與價格的快照，不依賴外鍵查詢
- 目的：避免商品資料日後變動影響歷史訂單記錄
