# Brad.log 留言／按讚根因修復（2026-11-23）

## 根本原因與最終設計

問題起初是 GitHub Pages 新文章已發布，但 Cloudflare Worker 仍使用只包含舊文章的 allowlist。初步方案加入 Worker 從公開 `engagement-pages.json` 執行時下載，卻在正式環境持續回 `/health/manifest` HTTP 503；即使舊 bundle 的按讚和留言讀取可用，這也是服務相依性問題，**不能將驗收 stage 標為成功**。

目前的最終架構已**取消 Worker 執行時跨網域抓取清單**，改成原子化發布契約：

1. GitHub Actions `build` 從 Astro 已輸出的 HTML 產生 `dist/engagement-pages.json`。
2. `deploy` 將該次網站與清單發布到 GitHub Pages。
3. `deploy-community-worker` **下載同一份 build artifact**，產生 Worker 的 bundled allowlist，使用 Cloudflare Token 與指定 D1 database ID 部署既有 Worker。
4. `verify-interactions` 逐項比較公開 Pages manifest 與建置 manifest，讀取 Worker `GET /health/manifest`，驗證 `source: "deploy-bundle"`、數量與**完整清單的 SHA-256 校驗碼**，並逐篇讀取留言和按讚 API。任何缺文、陳舊 bundle、API 失敗，都必須讓工作流程失敗。

這不再有「即時抓取失敗但備援正常，綠燈卻留下故障」的灰色狀態。新文章要能互動，必須與同次 build 的 Worker 一起成功部署。即使一個新文章不存在，後端仍會拒絕 `unknown_page`；不能藉任意外部 URL 建立互動資料。

## 權限和資料保護

正式部署只使用 GitHub Actions repository secrets（`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_D1_DATABASE_ID`）與 repository variable `CLOUDFLARE_WORKER_DEPLOY_ENABLED=true`。D1 binding 為 `DB`，沿用既有 Worker 的 `SIGNING_SECRET` 和 `TURNSTILE_SECRET` 加密變數；不重設既有留言、按讚或統計資料。檢查只進行 GET，不替讀者按讚或送出留言。

正式 Worker 健康檢查：

- `/health`：設定與 D1 是否可用。
- `/health/manifest`：`status: "ok"`、`source: "deploy-bundle"`、`pages`、`articles`、`sha256`。最後一個值必須與公開 Pages 清單和此次建置計算的 SHA-256 完全相同。

主要維護手冊：[ENGAGEMENT_SETUP.md](ENGAGEMENT_SETUP.md)。若最後 stage 失敗，應查看哪個條件失敗，而非直接放寬驗收或只重跑同一個舊 workflow attempt。
