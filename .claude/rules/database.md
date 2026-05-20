---
paths:
  - "src/database.js"
---

# 資料庫規則

## 欄位命名
- 資料庫欄位一律使用 snake_case：`user_id`、`created_at`、`image_url`
- 主鍵一律為 UUID v4 字串：`id TEXT PRIMARY KEY`
- 時間欄位使用 SQLite `datetime('now')` 產生 ISO 8601 字串

## Parameterized Queries（必要）
- 所有查詢必須使用 prepared statements：
  ```js
  db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  db.prepare('INSERT INTO users (id, ...) VALUES (?, ...)').run(id, ...)
  ```
- 禁止字串拼接 SQL

## Transaction 使用時機
- 多步驟操作（insert + update + delete）必須用 `db.transaction()`：
  ```js
  const doWork = db.transaction(() => { ... });
  doWork();
  ```

## 新增資料表
- 使用 `CREATE TABLE IF NOT EXISTS`（冪等）
- 啟用 foreign key 約束（已在 pragma 設定）
- 新增 seed 函式時，先用 SELECT 確認資料是否已存在再 INSERT

## SQLite WAL 模式
- 專案已啟用 `PRAGMA journal_mode = WAL`，不要移除此設定（提升並發讀取效能）

## bcrypt Salt Rounds
- 生產環境：10 rounds
- 測試環境（`NODE_ENV === 'test'`）：1 round（加快測試速度）
- 不要移除此條件判斷
