# Brad.log 設定與維護手冊

本文件保存可重現的設定、位置、原因與驗證方式。公開教學位於 `src/content/posts/github-pages-astropaper-guide.md`。所有真實密碼、API key、登入 cookie、私鑰與個人 Token 都不得寫入本文件或 Git 歷史。

## 1. 專案來源與版本

| 項目 | 本次設定 | 設定／查核位置 | 原因與驗證 |
| --- | --- | --- | --- |
| 主題 | AstroPaper 7.1.0 | `NOTICE.md`、`LICENSE` | 保留上游 MIT 聲明；原創文章權利另外說明 |
| 上游來源 | `6f61e2dc0e45bbcefc05f4055f293cd7f81bcb03` | [上游 commit](https://github.com/satnaing/astro-paper/tree/6f61e2dc0e45bbcefc05f4055f293cd7f81bcb03) | 固定初次匯入來源；不盲目覆蓋後續客製化 |
| Node.js | 24.22.1 | `.nvmrc`、workflow `node-version` | 本機與 CI 使用相同版本；`node --version` |
| pnpm | 11.25.0 | `package.json` 的 `packageManager`、workflow | `pnpm --version` |
| Astro | 解析版本見 lockfile | `package.json`、`pnpm-lock.yaml` | 不只記錄 semver 範圍；安裝使用 frozen lockfile |
| 安裝腳本白名單 | esbuild、sharp | `pnpm-workspace.yaml` 的 `allowBuilds` | 主題建置與圖片轉檔需要；新增套件另行審查 |
| Git 分支 | `main` | repository default branch、workflow | 推送主分支後才正式發布 |

取得程式碼後，執行：

```sh
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm dev
```

安裝 Node 的方式依作業系統選擇官方安裝程式或既有版本管理器；不要假設每個人都有 nvm。已有 nvm 時可執行 `nvm install`、`nvm use`。開啟終端機實際顯示的本機網址，並加上 `/brad-log/`。本機開發伺服器不是公開網址。

## 2. 網站與品牌設定

| 設定位置 | 欄位 | 本站公開值 | 用途／檢查 |
| --- | --- | --- | --- |
| `astro-paper.config.ts` | `site.url` | `https://bradcocox.github.io` | 網站 origin；不把 repo 路徑重複放進去 |
| `astro.config.ts` | `base` | `/brad-log` | GitHub project Pages 子路徑；測試所有站內連結與圖片 |
| 同上 | `trailingSlash` | `always` | 輸出目錄式網址，符合 Pages 靜態檔案結構 |
| `astro-paper.config.ts` | `site.title`／`author` | `Brad.log`／`Brad` | 標題、meta、RSS、預設文章作者 |
| 同上 | `site.description` | Brad 的工程筆記… | 首頁／社群／搜尋摘要；只寫可公開內容 |
| 同上 | `site.lang`、`timezone` | `zh-TW`、`Asia/Taipei` | 語言與文章日期顯示 |
| `astro.config.ts` | `i18n.locales`／`defaultLocale` | `zh-TW` | 與網站語言一致，不額外加語系前綴 |
| `src/i18n/lang/zh-TW.ts` | UI 字串 | 繁體中文 | 導覽、日期、搜尋、404 等文字 |
| `astro-paper.config.ts` | `posts.perPage`／`perIndex` | 8／4 | 標籤頁分頁與首頁最新筆記數量 |
| 同上 | `features.search` | `pagefind` | 靜態搜尋，建置後生成索引 |
| 同上 | `features.toc` | `true` | 長文章目錄；單篇可用 `hideToc` 關閉 |
| 同上 | `features.showArchives` | `true` | 依時間回顧學習歷程 |
| 同上 | `features.lightAndDarkMode` | `true` | 明暗主題；偏好保存在瀏覽器本機 |
| 同上 | `features.dynamicOgImage` | `false` | 使用本地靜態 OG 圖，避免建置抓取外部字型 |
| 同上 | `site.ogImage` | `brad-log-og.png` | 圖片位於 `public/`，社群預覽 1200×630 |
| 同上 | `features.editPost.url` | 公開 repo 的 `blob/main/` | 文章末／首的原始碼連結，不要求讀者有寫入權限 |
| 同上 | `socials`、`shareLinks` | 公開 GitHub repo；空分享清單 | 不包含私人 email 或範本帳號 |
| `src/styles/global.css`、`theme.css` | 字體、顏色與版面 | 系統字體、明暗主題 | 不載入 Google Fonts；中英混排與手機檢查 |
| `public/favicon.svg` | 網站圖示 | Brad.log 的 B 圖示 | 網頁分頁可見 |

換成自己的 repo 時，同時改 `site.url` 與 `base`，以及 author、profile、socials、原始碼連結。一般專案站是 `https://YOUR_GITHUB_USERNAME.github.io/your-blog/`；若 repo 名稱正好是 `YOUR_GITHUB_USERNAME.github.io`，那是使用者首頁站，`base` 應使用 `/`。不要把不同部署形式混用。

## 3. 文章與分類資料

文章放在 `src/content/posts/*.md`；圖片放在 `src/assets/guides/` 或 `src/assets/images/`。Markdown 使用相對圖片路徑，讓 Astro 處理資產網址。`public/` 內容會直接發布，不得放入內部檔案。

```yaml
---
title: "我的第一篇學習筆記"
description: "這篇筆記要解決的問題與你會學到什麼。"
pubDatetime: 2026-11-09T11:00:00+08:00
category: developer-tools
contentType: note
level: beginner
status: learning
tags: [git]
featured: false
draft: false
---
```

| 欄位 | 規則 | 管理方式 |
| --- | --- | --- |
| title／description／pubDatetime | 必填 | `src/content.config.ts` 會在 build 驗證 |
| category | 必填，六個 ID 擇一 | `src/data/domains.ts` 的 `DOMAIN_IDS` 與 `DOMAINS` |
| contentType | tutorial／note／troubleshooting／reading | 預設 note；與領域分開 |
| level | beginner／intermediate／advanced | 預設 beginner；表示閱讀所需程度 |
| status | verified／learning | 預設 learning；驗證過文中步驟再設 verified |
| tags | 自訂技術標籤陣列 | 預設空；用一致命名避免同義重複 |
| modDatetime | 選填，實際修訂時間 | 更新舊文時保留 pubDatetime，再新增 modDatetime |
| featured | 選填 boolean | 首頁推薦內容，不代表內容驗證狀態 |
| draft | 選填 boolean | 不產生公開文章頁；原始檔在公開 repo 仍公開 |
| author／timezone | 選填 | 預設使用網站設定 |
| hideToc／hideEditPost | 選填 boolean | 單篇介面調整 |
| ogImage／canonicalURL | 選填 | 只設定合法、可公開的圖片／正式來源網址 |

領域 ID：`data-engineering`、`backend-api`、`devops-cloud`、`ai-llm`、`system-design`、`developer-tools`。新增領域時，同步修改 DOMAIN_IDS 與 DOMAINS，再建置檢查。領域頁由 `src/pages/categories/[category].astro` 生成，總覽在 `src/pages/categories/index.astro`。沒有已公開文章的分類保持真實空狀態。

## 4. GitHub Pages 與 Actions

| 設定入口 | 設定值 | 原因／確認方式 |
| --- | --- | --- |
| Repo → Settings → Pages → Build and deployment → Source | GitHub Actions | 由 Astro 建置，不選 Jekyll 分支部署 |
| 同頁 Custom domain | 留空 | 使用預設 GitHub Pages 網域，本次不需 DNS 設定 |
| 同頁 Enforce HTTPS | 已勾選，預設網域要求 HTTPS | 瀏覽器最後網址以 https 開始 |
| `.github/workflows/deploy.yml` | `push` 的 `main`、`workflow_dispatch` | 正常推送自動發佈，也能在 Actions 手動重跑 |
| workflow 全域 `permissions` | `contents: read` | 建置不需要 repo 寫入權限 |
| checkout | 完整 SHA；`persist-credentials: false` | 避免把 Git 認證留給後續程式 |
| withastro/action | 完整 SHA；Node24.22.1、pnpm11.25.0 | 安裝、建置、上傳 dist artifact |
| `build-cmd` | `pnpm run build` | 包含型別檢查、Astro、Pagefind 與發布檢查 |
| `cache` | `false` | 不保留 Astro 跨執行建置快取；套件快取由官方 action 處理 |
| deploy job | `needs: build` | 建置失敗就不發布 |
| deploy job permissions | `pages: write`、`id-token: write` | Pages 發布與短效身分驗證，只限部署 job |
| deploy environment | `github-pages` | 可在 repo 的 Environments／Actions 看發布紀錄 |
| concurrency | `pages`、`cancel-in-progress: false` | 序列化正式部署，不中途取消已開始的發布 |
| Secret／PAT | 不需新增 | 不把任何個人權杖放入 workflow 或文章 |

三個直接使用的 Action SHA 已保存於 workflow，版本註解分別為 checkout v7、withastro/action v6、deploy-pages v5。SHA 為公開版本識別，不是憑證。更新時必須核對官方來源，不把版本釘選誤認成永久安全。

本次透過已登入的本機 Chrome 設定 Pages；既有 README 與 Git 歷史保留，匯入主題沒有覆蓋 `.git`。未變更協作者、登入憑證、付費方案、帳戶安全或私人 repository 權限。GitHub 後台未檢查的其他安全功能不列為已啟用。

### 4.1 本次一次性來源匯入紀錄

本次操作環境的本機 Git 推送與網站檔案上傳路徑受限，因此在完成本機內容準備後，透過已登入的 GitHub 網頁建立一次性 workflow，將已審閱、可公開的來源檔案送進既有儲存庫。這是本次來源交付的紀錄；日常寫作維持第 5 節的本機編輯、檢查、正常 Git 推送流程，不需要反覆封裝來源或建立匯入 workflow。

**已核實的匯入結果：** [Actions 執行紀錄 42561558484](https://github.com/bradcocox/brad-log/actions/runs/42561558484) 成功，產生來源匯入 commit [`71fc77bc79b3d5cbeed3c1c3e517aa4e56316e71`](https://github.com/bradcocox/brad-log/commit/71fc77bc79b3d5cbeed3c1c3e517aa4e56316e71)。首次匯入完成時，遠端共有 123 個檔案，其中 1 個為 workflow，其餘 122 個來源檔案已與交付版本逐位元組比對一致。這項結果確認原始碼交付完成，不能代替正式 Pages 建置、部署與網站人工檢查。

| 設定／紀錄 | 實際位置或值 | 原因與驗證方式 |
| --- | --- | --- |
| 暫時 workflow 建立方式 | GitHub 網頁編輯器；`.github/workflows/deploy.yml` | 使用既有登入操作儲存庫；不把登入憑證複製到程式或內容檔案 |
| 暫時 workflow commit | [`335481d049a5e485616a23ea89613bea8e4ef25e`](https://github.com/bradcocox/brad-log/commit/335481d049a5e485616a23ea89613bea8e4ef25e) | 保留一次性作業的可追查版本；它與 AstroPaper 上游來源 commit、來源匯入 commit 各自不同 |
| workflow 名稱 | `Import reviewed Brad.log source` | 與後續的 `Publish Brad.log` 正式發布工作區別 |
| 觸發條件 | `push` 到 `main`；另有 `workflow_dispatch` | 支援首次建立與必要時的人工執行 |
| job 執行條件 | `github.actor == github.repository_owner && github.ref == 'refs/heads/main'` | 限儲存庫擁有者、指定分支執行此次匯入 |
| 執行環境與時間限制 | `ubuntu-latest`；`timeout-minutes: 5` | 限制一次性匯入執行時間；結果查 Actions 日誌 |
| 同時執行控制 | `brad-log-initial-import`；`cancel-in-progress: false` | 避免兩份來源匯入同時改寫儲存庫 |
| checkout 版本 | `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1`，v7 | 取得既有分支與 Git 歷史；使用已核對的官方版本 |
| 來源封裝格式 | 檔案清單 JSON → gzip → base64；文字為 UTF-8，二進位檔案以 base64 表示 | 可在文字編輯器交付完整公開來源；編碼與壓縮不提供保密功能 |
| 分塊方式與大小 | 共 19 段；每段 `run` 小於 21,000 個字元；整份暫時 YAML 為 304,143 bytes，小於 500 KB | 控制單一步驟與整份網頁編輯內容的大小；這是此次封裝限制，不作為 GitHub 所有操作的通用容量承諾 |
| runner 暫存位置 | `$RUNNER_TEMP/brad-log.bundle.b64` | 分段組合後才解碼；不把暫存封包當網站資產提交 |
| 原始 payload 校驗 | 下方列出的 SHA-256；在 base64 解碼、gzip 解壓縮後，對原始 JSON bytes 計算 | 不吻合即停止，避免缺段或內容改動後仍繼續寫入 |
| 寫入範圍 | 122 個已審閱來源檔案；不寫入 `.git` 或 `.github/workflows/` | 保留 Git 歷史與目前執行的工作流程；正式部署檔另由網頁修改 |
| 路徑與 symlink 檢查 | 拒絕絕對路徑、`..`、離開 repo 根目錄的解析路徑，以及目標或父資料夾的 symlink | 同時檢查原始與解析後路徑，避免透過不同路徑寫入受限位置 |
| 寫入前後檢查 | 寫入前核對 payload SHA-256；寫入後執行 `node scripts/check-public.mjs --source` | 來源掃描通過才進入 commit；仍保留人工內容與圖片審查 |
| 權限與憑證 | workflow 全域 `permissions: {}`；僅 `import-source` job 為 `contents: write` | 只在本次提交來源時需要寫入權限；使用 GitHub 內建短效 `GITHUB_TOKEN`，沒有新增個人 PAT、自訂 Secret 或部署私鑰 |
| 提交身分 | `github-actions[bot]` 與 GitHub 提供的 bot noreply 身分 | 不把個人的 email 寫入這次自動提交設定；本文件不複製任何私人聯絡資訊 |
| 提交與推送方式 | 有差異才 commit，再正常 `git push origin HEAD:main` | 在既有歷史後新增提交；沒有強制推送、刪除 `.git` 或覆寫歷史 |
| 匯入後核對 | 來源匯入 commit；遠端 123 檔，其中 122 個來源檔案逐位元組相同 | 比對的是首次匯入快照；之後修改本手冊或文章會產生新的正常差異 |

此次公開來源 JSON 原始 payload 的 SHA-256：

```text
1b4d437124e80dbd1b31dc19abcb85294750224fe608d6480e2c4328b76500a4
```

此雜湊用於核對傳輸內容與審閱版本是否相同，本身不是憑證，也不代表內容已接受全面安全稽核。完整一次性實作可由上方暫時 workflow commit 查閱，日常部署檔不保留這些來源分塊。

**匯入完成後的處置：** 已在同一個 `.github/workflows/deploy.yml` 換成第 4 節的正式 Pages workflow，移除來源封包、匯入程式與 job 的 `contents: write`。正式建置只讀取原始碼，checkout 設定 `persist-credentials: false`；只有部署 job 保留 `pages: write` 與 `id-token: write`。

正式 workflow 替換 commit 為 [`0d267fd25cf9762c1e9957ed16ccf29dcda5f5be`](https://github.com/bradcocox/brad-log/commit/0d267fd25cf9762c1e9957ed16ccf29dcda5f5be)。[初次正式 Pages 部署紀錄 42562002827](https://github.com/bradcocox/brad-log/actions/runs/42562002827) 的 `build` 與 `deploy` 均成功，公開網址 [Brad.log](https://bradcocox.github.io/brad-log/) 已可訪問；精確執行與完成時間以該次 Actions 紀錄為準。

本機 Chrome 的實拍保存於 `src/assets/guides/actions-success.jpg` 與 `src/assets/guides/site-home.jpg`，並用於首篇文章的圖 6、圖 7。Actions 圖只保留工作圖，首頁圖保留完整頁面；沒有加入私人帳戶設定畫面或聯絡資訊。部署成功與各項 UI 驗證分開記錄，文章狀態在完整功能檢查完成前維持 `learning`。

## 5. 實際更新流程

```sh
git pull --ff-only
# 新增或修改 Markdown，圖片先做人工隱私檢查
pnpm build
pnpm preview
# 開啟終端機顯示的預覽網址，檢查 /brad-log/
git status --short
git add src/content/posts/my-note.md src/assets/images/my-diagram.svg
git diff --cached
git commit -m "docs: add learning note"
git push origin main
```

只加入你確定要公開的檔案；範例路徑須換成實際檔名。`pnpm build` 成功後，到 GitHub → Actions → Publish Brad.log 查看 build 與 deploy 結果，再開正式網址確認。只跑 `astro build` 會少掉 Pagefind 索引與本專案的發布掃描。

## 6. 建置檢查、發布檢查與限制

`pnpm build` 順序：來源憑證模式掃描 → `astro check` → `astro build` → `pagefind --site dist` → 複製索引供本機開發 → 產出文字檔掃描。

人工確認：首頁與六個分類、文章閱讀與放大圖片、手機選單、明暗主題、中文／英文搜尋、空結果、RSS、sitemap、圖片與子路徑、所有截圖中的敏感資訊。確認的是當次內容與環境，並非滲透測試或安全保證。

`SECURITY.md` 記錄保密範圍與誤傳憑證處置。自製掃描器只查已列舉的常見模式；圖片、混淆資料、歷史與非典型憑證仍需要人工或專業工具檢查。不得用 CSS 遮蔽、draft 或 robots.txt 代替存取控制。

## 7. 出錯時怎麼查

| 現象 | 優先確認 |
| --- | --- |
| 首頁有字但樣式／圖片404 | base 是否和 repo 名稱一致，程式連結有沒有使用 getRelativeLocaleUrl／getAssetPath |
| Actions 無執行紀錄 | workflow是否在main、檔名是否在.github/workflows、Actions是否被停用 |
| 部署403／Pages未設定 | Settings → Pages → Source，以及deploy的兩個權限、environment |
| 型別／frontmatter失敗 | 日期格式、必填category、拼字與允許值；看第一個錯誤 |
| 新文章沒出現 | draft、未來發布日期、推送分支、建置是否成功 |
| 搜尋找不到新內容 | 使用完整pnpm build重建索引，等待新部署，確認文章已公開 |
| 圖片無法建置 | 檔名大小寫、相對路徑、原圖是否已加入Git |
| 套件安裝失敗 | Node與pnpm版本、lockfile是否提交；不先刪鎖檔硬裝最新版 |
| 掃描器阻止發佈 | 本機檢查回報檔案與行號；不得把真實匹配值貼上公開日誌 |

## 8. 還原與未來維護

一般內容錯誤可用新的修正 commit，或確認目標後 `git revert <commit>`，再由 Actions 發布；不要為了普通修改強制推送或刪除歷史。如果是敏感資料外洩，先撤銷憑證再處理歷史及各種副本，不能只靠 revert。

保存這個 repo 即可保留程式、圖文、版本鎖定及工作流程。換電腦後 clone、安裝指定版本、frozen-lockfile建置。GitHub Pages 的 Source 等後台設定不在 Git 中，因此此手冊另列位置與值。後續更新主題請用分支比較變更，保留分類擴充、文章、資產與本手冊。

官方參考：[Astro部署GitHub](https://docs.astro.build/en/guides/deploy/github/)、[AstroPaper](https://github.com/satnaing/astro-paper)、[GitHub Actions安全](https://docs.github.com/en/actions/reference/security/secure-use)、[Astro環境變數](https://docs.astro.build/en/guides/environment-variables/)。
