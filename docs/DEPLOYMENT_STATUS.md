# Brad.log 部署與驗證紀錄

驗證時間：2026-11-09 12:35（Asia/Taipei）。本文件記錄初次上線及後續圖文補充；未來更新以 GitHub Actions 最新成功的執行紀錄為準。

## 正式入口

- [Brad.log 首頁](https://bradcocox.github.io/brad-log/)
- [第一篇完整架站教學](https://bradcocox.github.io/brad-log/posts/github-pages-astropaper-guide/)
- [儲存庫](https://github.com/bradcocox/brad-log)
- [所有發布紀錄](https://github.com/bradcocox/brad-log/actions/workflows/deploy.yml)
- [完整設定與維護手冊](SETUP.md)

## 已完成的初次部署

1. 已審閱的 122 個來源檔案成功匯入既有 Git 歷史，與本機交付版本逐位元組一致。詳見 [來源匯入 run](https://github.com/bradcocox/brad-log/actions/runs/42561558484)。
2. `.github/workflows/deploy.yml` 已換成正式 `Publish Brad.log`。建置只有 `contents: read`，checkout 不持久保存認證；僅 deploy job 取得 Pages 與短效身分驗證所需權限。
3. 首次正式部署 commit 為 `0d267fd25cf9762c1e9957ed16ccf29dcda5f5be`。[run 42562002827](https://github.com/bradcocox/brad-log/actions/runs/42562002827) 的 `build` 與 `deploy` 均成功。
4. Pages Source 為 GitHub Actions；自訂網域留空；預設網域使用 HTTPS。已從本機 Chrome 開啟正式網站與文章，確認不是本機預覽。

## 實際瀏覽器驗證

| 項目 | 已觀察結果 |
| --- | --- |
| 首頁與文章 | 品牌、摘要、日期、文章入口與樣式正常；直接開啟文章網址可讀取 |
| 專業領域 | 六個入口與真實文章數；資料工程空分類顯示清楚的空狀態與返回文章入口 |
| 所有文章篩選 | 領域、文章型態、清除篩選正常，網址保留選項；排序選單與網址狀態正常，初次只有一篇文章，未以多篇資料驗證排序次序 |
| 搜尋 | 中文「部署」、英文「AstroPaper」各找到首篇；無結果提示、清除輸入與網址參數正常 |
| 明暗主題 | 已切換並檢視深色畫面，再恢復淺色 |
| 手機寬度 | 390 × 844 視窗；首頁與長文章無整頁橫向溢出；選單展開與 Escape 關閉正常 |
| 圖文 | 四張 SVG 說明圖已在瀏覽器放大檢視，中文字體與內容正常；圖片預覽可關閉及使用 Escape |
| 長文目錄 | 目錄可展開，點選章節可跳到對應位置 |
| 瀏覽器紀錄 | 上述操作期間未觀察到 warning 或 error |

以上是本次 Chrome 的功能與畫面檢查，未宣稱已涵蓋所有瀏覽器、所有裝置或完整無障礙稽核。

## 內容與建置

- 第一篇為初學者教學，已補入七張圖：四張說明圖、Pages Source 設定實拍、Actions 成功實拍、正式首頁實拍。
- `actions-success.jpg` 僅保留工作流程與公開站點；圖片不含登入選單、通知、私人聯絡資料或憑證。`site-home.jpg` 為初次上線的正式首頁。
- 首篇狀態更新為 `verified`，新增實際修訂時間；日常學習筆記仍可使用 `learning`。
- 本機與首次 CI 建置通過；Astro 檢查 67 檔案，無 errors、warnings 或 hints，產生 19 頁及 zh-tw Pagefind 索引。
- 來源及建置輸出中的常見憑證模式掃描通過。掃描器不能取代人工審查，不檢查圖片文字或歷史中所有敏感資料。
- 本次為補入實拍與驗證文件，再使用同一種一次性匯入方式交付差異檔案，完成後同樣換回正式最小權限 workflow；日常文章更新使用正常 Git 推送。

本次沒有建立 PAT、自訂部署 Secret 或部署私鑰，沒有改寫既有 Git 歷史或修改帳戶層級設定。公開 repo 的原始檔與 Git 歷史仍屬公開資料；保密規則與處置方式請見 [SECURITY.md](../SECURITY.md)。
