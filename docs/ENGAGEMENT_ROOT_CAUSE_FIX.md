# Brad.log 留言／按讚根因修復（2026-11-23）

## 已確認的設計缺口

GitHub Pages 每次透過 Actions 發布文章，但 Cloudflare Worker 原先採 Dashboard 手動部署。倘若 Worker 從固定來源 `/brad-log/engagement-pages.json` 讀取失敗，內建 `backend/allowed-pages.json` 只有首篇文章，新增文章會得到 `404 unknown_page`。之前部署成功只驗證了 HTML，沒有逐篇驗證留言 API。

## 新的發布契約

1. 建置從正式 Astro HTML 輸出產生 `dist/engagement-pages.json`；Actions 把**這份實際發布的清單**留作短期 artifact。
2. GitHub Pages 成功發布後，若已授權 Cloudflare CI，使用同一份 manifest 建構 Worker fallback，並更新既有正式 Worker，無需重設 D1 或重置統計。
3. Worker 動態讀取同一個固定網域的公開清單，驗證大小、頁面合法性和文章路徑；成功快取五分鐘，失敗保留最近已驗證清單、三十秒後重試。不能讓訪客指定任意 outbound URL。
4. `GET /health/manifest` 顯示清單同步狀態及文章數，不公開秘密。讀取失敗返回 HTTP 503。
5. 發布後 `verify-interactions` 會檢查公開清單與本次建置一致，再逐篇呼叫 `GET /v1/comments`。任何 `unknown_page` 都會把此次 Actions 驗收標成失敗，不能再出現「發布成功但無法留言」的假綠燈。

## 一次性授權：Cloudflare Worker 自動部署

在 GitHub `bradcocox/brad-log` → Settings → Secrets and variables → Actions：

- 新增 **repository secrets**：`CLOUDFLARE_API_TOKEN`（僅限此 Cloudflare 帳戶的 Workers 編輯權限）、`CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_D1_DATABASE_ID`。
- 確認現有 Cloudflare Production 的 Worker `brad-log-community` 已有 D1 `DB`、加密的 `SIGNING_SECRET`／`TURNSTILE_SECRET` 和現有 `FEATURES_ENABLED` 設定。
- 最後新增 **repository variable**：`CLOUDFLARE_WORKER_DEPLOY_ENABLED`，值為 `true`。

未提供前述授權時，Worker job 會跳過，**不能宣稱正式互動服務已修好**；發布後驗收仍會檢查並顯示異常。這些 ID／Token 不寫在公開 repo，`backend/scripts/prepare-production-config.mjs` 只在 CI 產生暫存設定；`keep_vars:true` 保留現有 Production 變數和加密 secrets，不把 Wrangler 範本的 `FEATURES_ENABLED:false` 覆蓋到線上。

完成一次設定後，可從 Actions → Publish Brad.log → Run workflow 重新部署；往後每次 `main` 發文會自動同步文章清單與更新 Worker。

請勿手動清空 D1 或關閉 Turnstile。測試只讀取公開清單與已核准留言列表，不會創造測試留言、按讚或流量脈衝。

官方參考：https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
