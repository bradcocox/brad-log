# Brad.log｜Brad 的工程筆記

記錄技術學習、實作與排錯，讓每一步都有跡可循。

- 網站：[Brad.log](https://bradcocox.github.io/brad-log/)
- 首篇：[從零開始架設圖文技術部落格](https://bradcocox.github.io/brad-log/posts/github-pages-astropaper-guide/)
- [完整設定與維護手冊](docs/SETUP.md)
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

Settings → Pages → Source 選擇 GitHub Actions。推送 main 後執行 `.github/workflows/deploy.yml`，先檢查與建置、產生 Pagefind 索引，再部署 GitHub Pages。不需要個人 PAT 或額外 Secret。

目前設計包含六個領域、真實文章數與空狀態、文章型態與程度、繁體中文搜尋、時間彙整、明暗主題，以及適合手機閱讀的圖文文章。

## 致謝

基於 AstroPaper 7.1.0；保留上游 `LICENSE`。初始來源、客製化與原創內容權利見 `NOTICE.md`。
