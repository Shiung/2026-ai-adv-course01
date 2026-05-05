---
paths:
  - "views/**"
  - "public/js/**"
  - "src/routes/pageRoutes.js"
---

# 前端/模板規則

## EJS Layout 模式
- 前台頁面使用 `renderFront(res, 'page-name', locals)` 輔助函式（定義於 pageRoutes.js）
- 後台頁面使用 `renderAdmin(res, 'admin/page-name', locals)`
- 頁面 EJS 放 `views/pages/`，後台頁面放 `views/pages/admin/`
- 共用片段放 `views/partials/`（head、header、footer、notification 等）
- 不要直接 `res.render('layouts/...')`，使用輔助函式確保 layout 包裹一致

## pageRoutes locals 慣例
- 每個頁面路由需傳入 `title`（頁面標題）和 `pageScript`（載入的 JS 模組名稱）
- `pageScript` 對應 `public/js/pages/<pageScript>.js`
- 需傳給模板的資料（如 `productId`）直接加入 locals 物件

## Tailwind CSS
- 樣式寫在 `public/css/input.css`（Tailwind 來源）
- 不要直接編輯 `public/css/output.css`（自動產生）
- 自訂類別用 `@layer` 加入 Tailwind 設定
- 開發時執行 `npm run dev:css` 即時編譯，部署前執行 `npm run css:build`

## 前端 JS 架構
- 各頁面 JS 放 `public/js/pages/<page-name>.js`（kebab-case）
- 跨頁共用邏輯放 `public/js/` 根層（api.js、auth.js、notification.js）
- `api.js`：封裝所有 fetch 呼叫（含 JWT / session header 處理）
- 頁面 JS 透過 `pageScript` local 在 layout 中動態載入

## XSS 防護
- EJS 模板輸出用 `<%= %>`（HTML escape），不用 `<%- %>`（除非明確需要輸出 HTML）
- 動態插入 DOM 用 `textContent` 而非 `innerHTML`
- 若必須用 `innerHTML`，需先對內容進行 sanitize
