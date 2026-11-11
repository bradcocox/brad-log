# Brad.log 圖像與初學者教學規範

更新日期：2026-11-11（Asia/Taipei）

## 驗收標準

1. 每篇入門教學至少有一張**真正的產品介面畫面**，不以 AI 想像 UI 代替。沒有實測畫面時，使用官方文件／開源專案提供的產品截圖，明確註明來源與適用版本。
2. 每個關鍵操作須有「做什麼 → 看哪裡 → 正常結果 → 排查方式」，不只列安裝指令。
3. 截圖旁要解釋讀者應注意的具體 UI 元素，且不把官方示範畫面寫成作者親自完成的操作紀錄。
4. 官方截圖若出現付費模型、訂閱按鈕或舊版本 UI，應在圖說及附近正文說明；不將它當零成本設定的推薦結果。
5. API Keys、Tokens、內網地址、私人路徑、電子郵件、客戶資料在發布前必須檢查。不能僅靠模糊化輸出的文字稿；也要審查圖檔本身及 Git 歷史。
6. 網站圖片要使用 Astro 資源處理方式、替代文字及響應式版面，並在手機寬度避免水平溢出。
7. 指令、API 路徑、UI 名稱須引用第一手官方文件。沒有在真正環境驗證的步驟統一標註「學習整理」，不能聲稱實測通過。

## 圖檔來源清單

以下圖檔為**官方發布的產品畫面**。作者僅縮放／裁切／轉成 WebP 以改善載入；不是自己實測截圖，更不是 AI 生成。官方素材介面會隨版本改動；本篇以 2026-11-11 取得之原圖為準。

| 本地資產 | 圖像來源（第一手） | 用途／注意事項 |
| --- | --- | --- |
| `src/assets/screenshots/opencode-terminal-official.webp` | [OpenCode 官網專案截圖](https://github.com/anomalyco/opencode/blob/dev/services/site/public/brand/screenshots/opencode-terminal-dark.webp) | 真實終端機介面；官方樣本可能展示付費模型 |
| `src/assets/screenshots/opencode-desktop-official.webp` | [OpenCode 桌面版截圖](https://github.com/anomalyco/opencode/blob/dev/services/site/public/brand/screenshots/opencode-desktop.webp) | 真實桌面版 Diff；不是本文的 Python 專案 |
| `src/assets/screenshots/cline-free-models-official.webp` | [Cline 免費模型官方文件](https://docs.cline.bot/getting-started/free-models) | 官方 Cline Nightly 版本 VS Code 設定，免費清單會變 |
| `src/assets/screenshots/kilo-settings-official.png` | [Kilo Code 官方儲存庫](https://github.com/Kilo-Org/kilocode/blob/main/packages/kilo-docs/public/img/mistral-setup/01-open-kilo-code-settings.png) | 設定齒輪；畫面含「團隊方案試用」宣傳，非必需 |
| `src/assets/screenshots/kilo-profile-official.png` | [Kilo Code 官方儲存庫](https://github.com/Kilo-Org/kilocode/blob/main/packages/kilo-docs/public/img/mistral-setup/02-add-configuration-profile.png) | 配置 Profile 示範，對應舊版／不同版本 UI 須核對 |
| `src/assets/screenshots/ccr-provider-router-official.webp` | [Claude Code Router 官方專案](https://github.com/musistudio/claude-code-router/blob/main/blog/images/ui.png) | 原圖裁切左半部：Provider 新增／清單；示例有付費模型，不能照抄 |
| `src/assets/screenshots/ccr-model-routing-official.webp` | [Claude Code Router 官方專案](https://github.com/musistudio/claude-code-router/blob/main/blog/images/ui.png) | 原圖裁切右半部：Default／Background／Think 等路由；不含原圖中遮蔽的個人路徑 |
| `src/assets/screenshots/codex-dashboard-official.webp` | [Codex Router 官方 Dashboard](https://github.com/duolahypercho/codex-router/blob/main/docs-site/public/app/control-center-dashboard.png) | 確認 Router 狀態、流量數據 |
| `src/assets/screenshots/codex-models-official.webp` | [Codex Router 官方 Models](https://github.com/duolahypercho/codex-router/blob/main/docs-site/public/app/control-center-models.png) | 連接 Provider／開關模型；樣本資料非本文測試 |

## 尚未拍到的畫面（後續補拍清單）

- [ ] OpenCode 實際 `/connect`、`/models`、一次 `ask` 權限提示及練習測試通過畫面。
- [ ] Cline 正式版 OpenRouter 設定、Plan／Act 切換、檔案改動核准提示。
- [ ] Kilo Code 新版 VS Code／CLI 免費模型清單、`ask`／`code` 模式實際任務。
- [ ] Claude Code Router 最新管理 UI：新增 OpenRouter、啟動、日誌驗證。
- [ ] Codex Router 安裝精靈、Doctor 驗證、免費模型路由執行回饋。
- [ ] 桌面 1440px、平板 768px、手機 390px 的所有圖文與表格排版截圖。

**補拍前置條件：** 需有該工具的真實執行環境，並取得使用者授權的測試專案或使用公開的隔離 Playground；本次只有官方素材與離線文件驗證，不能冒稱這些項目完成。
