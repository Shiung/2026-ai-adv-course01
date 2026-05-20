---
paths:
  - "views/**"
---

# 前端/EJS 模板規則

## EJS 兩段式渲染
- 頁面路由使用兩次 `res.render`：先渲染 partial，再注入 layout
  ```js
  res.render('pages/xxx', locals, (err, body) => {
    res.render('layouts/front', { body, ...locals });
  });
  ```
- `pageScript` 變數告訴 layout 載入哪個 `public/js/pages/*.js`

## 模板命名
- EJS 模板使用 kebab-case：`product-detail.ejs`、`admin-header.ejs`
- 前台模板放在 `views/pages/`，後台放在 `views/pages/admin/`
- 可重用元件放在 `views/partials/`

## XSS 防護
- 在 EJS 中顯示用戶輸入的內容必須使用 `<%= %>` (HTML escape)，禁止使用 `<%- %>` (unescaped)
- 除非明確知道內容是安全的 HTML（例如 layout 注入 body），才使用 `<%-`

## Tailwind CSS
- 使用 Tailwind utility class，避免寫自訂 CSS（除非 Tailwind 無法實現）
- CSS 來源：`public/css/input.css`；建置輸出：`public/css/output.css`
- 修改 CSS 後需重新建置：`npm run css:build`（或開發時使用 `npm run dev:css`）

## 前端 JavaScript
- 每個頁面對應一個 `public/js/pages/*.js`（kebab-case 命名）
- API 呼叫統一透過 `public/js/api.js` 的工具函式
- Auth 狀態（token 取得/儲存/清除）透過 `public/js/auth.js`
