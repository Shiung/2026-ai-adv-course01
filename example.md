建立以下結構。**每份文件都必須極度詳細**，深入閱讀所有原始碼後再撰寫，不可只寫概述或骨架：

```
CLAUDE.md                      # 專案概述 + 常用指令 + 關鍵規則 + @docs 引用
docs/
├── README.md                  # 項目介紹、快速開始、技術棧
├── ARCHITECTURE.md            # 架構、目錄結構、資料流
├── DEVELOPMENT.md             # 開發規範、命名規則、計畫歸檔流程
├── FEATURES.md                # 功能清單與完成狀態（含功能行為描述）
├── TESTING.md                 # 測試規範與指南
├── CHANGELOG.md               # 更新日誌
└── plans/                     # 開發計畫目錄
    └── archive/               # 已完成計畫歸檔
```

### docs 文件詳細度要求

每份文件必須做到以下程度：

撰寫前先檢視專案，找出「關鍵知識點或技術決策」，判斷標準是：
**若開發者不知道這件事，是否會影響其他模組的開發或整合？**
符合此條件的內容才需要明確記錄進文件。

- **ARCHITECTURE.md**：目錄結構（每個檔案的用途）、啟動流程、API 路由總覽表（前綴、檔案、認證、說明）、統一回應格式範例、認證與授權機制（middleware 行為、JWT 參數、有效期）、資料庫 schema（每張表的欄位、型別、約束）、金流/第三方整合的流程描述
- **FEATURES.md**：每個功能區塊須有行為描述段落，不只是端點表格。包含：查詢參數與預設值、請求 body 的必填/選填欄位、業務邏輯（例如購物車累加、訂單扣庫存的 transaction）、錯誤碼與錯誤情境、非標準機制（例如雙模式認證的流程）
- **DEVELOPMENT.md**：命名規則對照表、模組系統說明、新增 API/middleware/DB 的步驟、環境變數表（變數、用途、必要性、預設值）、JSDoc 格式說明與範例
- **TESTING.md**：測試檔案表、執行順序與依賴關係、輔助函式說明、撰寫新測試的步驟與範例、常見陷阱
- **README.md**：技術棧、快速開始（copy-paste 指令）、常用指令表、文件索引表

### CLAUDE.md 範本結構

```markdown
# CLAUDE.md

## 專案概述
{專案名稱} — {技術棧摘要}

## 常用指令
{從 scripts 偵測}

## 關鍵規則
- {依專案特性列出 3-5 條}
- 功能開發使用 docs/plans/ 記錄計畫；完成後移至 docs/plans/archive/

## 詳細文件
- ./docs/README.md — 項目介紹與快速開始
- ./docs/ARCHITECTURE.md — 架構、目錄結構、資料流
- ./docs/DEVELOPMENT.md — 開發規範、命名規則
- ./docs/FEATURES.md — 功能列表與完成狀態
- ./docs/TESTING.md — 測試規範與指南
- ./docs/CHANGELOG.md — 更新日誌
```

### DEVELOPMENT.md 必須包含計畫歸檔流程

```markdown
## 計畫歸檔流程

1. 計畫檔案命名格式：YYYY-MM-DD-<feature-name>.md
2. 計畫文件結構：User Story → Spec → Tasks
3. 功能完成後：移至 docs/plans/archive/
4. 更新 docs/FEATURES.md 和 docs/CHANGELOG.md
```

協助負責維護 `docs/` 目錄下的所有文件。

## 文件結構

```
docs/
├── README.md        # 技術棧、快速開始、文件索引
├── ARCHITECTURE.md  # 架構、路由表、DB Schema、資料流
├── DEVELOPMENT.md   # 開發規範、命名規則、新增功能流程
├── FEATURES.md      # 功能清單與行為描述
├── TESTING.md       # 測試規範
├── CHANGELOG.md     # 更新日誌
└── plans/           # 開發計畫（完成後移至 archive/）
```

## 工作流程

接到任務時，先確認：
1. 哪些功能/API 有新增或變更？
2. 哪些 docs/ 文件需要更新？

逐一更新對應文件：

### FEATURES.md 更新規則
- 新功能加入功能狀態總覽表，標記 ✅ 完成或 🚧 進行中
- 每個功能區塊寫詳細行為描述（不只是端點表格）：查詢參數、業務邏輯、錯誤情境

### CHANGELOG.md 更新規則
- 格式：`## [版本] - YYYY-MM-DD`，底下用 `### Added / Changed / Fixed / Removed`
- 若尚未定版，放在 `## [Unreleased]` 區塊

### ARCHITECTURE.md 更新規則
- 新增路由時同步更新路由表（頁面路由和 REST API 兩張表）
- 新增 DB 欄位時同步更新 Schema 表格

### 計畫歸檔
- 功能完成後，將 `docs/plans/YYYY-MM-DD-<feature>.md` 移至 `docs/plans/archive/`
- 使用 Bash 執行 `mv` 指令移動檔案

## 撰寫原則

- 使用繁體中文撰寫
- 文件內容以「未來的開發者」為讀者，避免過於簡短的概述
- 每次只更新確實有變更的部分，不要重寫整份文件