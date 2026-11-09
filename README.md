# Brad.log｜Brad 的工程筆記

記錄技術學習、實作與排錯，讓每一步都有跡可循。

- 網站：[Brad.log](https://bradcocox.github.io/brad-log/)
- 首篇：[從零開始架設圖文技術部落格](https://bradcocox.github.io/brad-log/posts/github-pages-astropaper-guide/)
- [完整設定與維護手冊](docs/SETUP.md)
- [免費匿名按讚、留言與統計設定](docs/ENGAGEMENT_SETUP.md)
- [公開內容與安全發布](SECURITY.md)
- [來源與權利說明](NOTICE.md)

## 本機開發

Node.js 24.22.1、pnpm 11.25.0。使用 `.nvmrc` 或官方 Node 安裝方式準備環境。

```sh
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm dev
pnpm build
pnpm preview
```

開啟終端機顯示的網址並使用 `/brad-log/` 子路徑。修改過文章後重新 `pnpm build`，搜尋才會使用新索引。

## 寫筆記

文章放在 `src/content/posts/`，使用 Markdown。`title`、`description`、`pubDatetime`、`category` 必填。專業領域定義在 `src/data/domains.ts`；`contentType`、`level`、`status` 與 tags 各自管理。完整範例見設定手冊。

公開 repo 的草稿原始檔也公開。私人筆記與敏感資料請放在 repo 外，不能依靠 `draft: true` 保密。

## 發布

Settings → Pages → Source 選擇 GitHub Actions。推送 main 後執行 `.github/workflows/deploy.yml`，先檢查與建置、產生 Pagefind 索引，再部署 GitHub Pages。這個靜態網站發布流程不需要個人 PAT 或額外 GitHub Secret；下方互動後端的兩個 runtime secrets 只設定在 Cloudflare Worker。

目前設計包含六個領域、真實文章數與空狀態、文章型態與程度、繁體中文搜尋、時間彙整、明暗主題，以及適合手機閱讀的圖文文章。

## 免費匿名互動模組

`backend/` 提供 Cloudflare Workers Free＋D1 的瀏覽統計、近兩分鐘活躍估計、可取消按讚與先審後發留言。讀者不需要帳號；網站維護者需要自己的免費 Cloudflare 帳戶。Turnstile 僅在主動互動時載入，管理秘密只放後端。

2026-11-09 已透過本機 Chrome 確認 Workers **Free、$0**，完成 D1、Turnstile 與 [正式 Worker](https://brad-log-community.bradcocox.workers.dev) 的 Production 配置。D1 應用程式 schema 為 8 個資料表、6 個索引、3 個觸發器；本次沒有付款、綁卡、安裝 GitHub App 或建立 PAT。**前後端已上線，主要功能已在正式網站驗證**：真實統計、Turnstile、按讚後重新整理與取消、匿名留言送出、先審後發，以及桌機／手機版面。

Turnstile 載入修正的 [run 42597413477](https://github.com/bradcocox/brad-log/actions/runs/42597413477) 與手機目錄避讓修正的 [run 42598765590](https://github.com/bradcocox/brad-log/actions/runs/42598765590) 均成功；手機互動區的送出按鈕已確認不被浮動目錄遮住。QA 留言在驗證批准／拒絕流程後已隱藏，未留在公開列表。定時清理另已觀察到過期 presence 清除的資料層結果；Cron Events 列表尚未顯示紀錄。本次瀏覽器仍有 GitHub 登入狀態，但網站互動沒有要求 GitHub 登入或使用其驗證流程；未另做登出／無痕測試。完整證據及未測範圍見 [互動手冊第 13 節](docs/ENGAGEMENT_SETUP.md#13-正式驗證紀錄) 與 [部署狀態](docs/DEPLOYMENT_STATUS.md)。

本次採 Dashboard 手動部署：在 `backend/` 執行 `npm run migration:console` 產生 D1 Console 可貼上的單行 SQL，並以 `npm run bundle` 產生 Worker 單一 module。兩個秘密只放 Production 的 Encrypted secrets。**`backend/wrangler.jsonc` 仍是關閉、含 D1 placeholder 的起始模板，不能直接用它覆蓋正式環境。**

前端連線設定在 `src/data/engagement.ts`，全新重建時先完成後端配置與驗證，再啟用前端；公開 site key 與 API 網址可放前端，secret key 不行。執行 `pnpm test:community` 檢查後端的受控測試；`pnpm build` 會執行測試並產生公開頁面允許清單。本機測試、正式連線與讀者操作分開記錄，完整設定、免費額度、資料保留、留言審核與維護限制見互動手冊。

## 致謝

基於 AstroPaper 7.1.0；保留上游 `LICENSE`。初始來源、客製化與原創內容權利見 `NOTICE.md`。
