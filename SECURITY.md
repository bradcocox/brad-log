# 公開內容與安全發布

Brad.log 是公開的靜態網站，這個 GitHub repository 也公開。所有文章、圖片、原始碼、Git 歷史、Actions 紀錄和搜尋索引都應視為可能被任何人讀取。本文件記錄規則，不包含真實憑證。

## 這個專案需要哪些秘密？

目前不需要設定任何 repository Secret、PAT、部署私鑰或資料庫密碼。GitHub Actions 使用平台提供的短效權杖完成部署；不要自行把權杖複製到檔案中。建置 job 僅有 `contents: read`；部署 job 才有 `pages: write` 與 `id-token: write`，且不執行文章程式碼。checkout 不保留 Git 憑證。

## 每次公開前

1. 文章內的帳號範例使用 `YOUR_GITHUB_USERNAME`，網域範例使用 `example.com`，機密值使用 `<REDACTED>`。公開網站網址、公開 repo 名稱、固定 Action SHA 與套件版本不是秘密。
2. 不要提交密碼、PAT、API key、私鑰、cookie、session、OTP、公司內網主機名、客戶資料或私人聯絡方式。紀錄密鑰的「名稱／用途／設定位置」，不紀錄密鑰本身。
3. 截圖只擷取必要設定區；確認網址列、帳戶選單、通知、email、終端機命令、日誌與圖片中都沒有敏感內容。需要遮蔽時，以不可還原的方式移除，再檢查最終匯出檔與中繼資料。不要以 CSS 蓋住文字，或把未遮蔽原圖一起提交。
4. 先執行 `pnpm security:check`，再執行 `pnpm build`。建置會掃描可提交原始碼和產出文字檔；此檢查僅辨識列出的常見憑證模式，不讀圖片內容、不分析所有編碼、不保證沒有遺漏，也不掃描 Git 歷史。
5. 人工看過 `git diff --cached` 與將發布的文章、圖片，再推送。不要把含真實值的檢查結果貼到公開 issue。

## 容易誤會的界線

- `.gitignore` 只防止一般未追蹤檔案加入 Git；已經提交過的內容仍在歷史中，不能靠新增忽略規則收回。
- `draft: true` 只阻止文章出現在網站，**不會讓公開 repo 裡的原始文章變成私人內容**。真正私人的草稿應放在 repo 外。
- Astro 的 `PUBLIC_` 變數會暴露給瀏覽器。即使沒有 `PUBLIC_`，在建置時寫入 HTML、JSON、JS 或圖片的資料也已經公開。
- GitHub Actions Secrets 只協助保存工作流程用的憑證；把 Secret 寫進靜態產物，依然會公開。這個專案沒有這種需求。
- 隱藏導覽、`robots.txt`、不列在搜尋結果、難猜的網址，以及只對畫面打碼，都不是存取控制。
- 目前沒有分析追蹤碼、第三方評論嵌入或外連字型；站內搜尋使用本地生成的 Pagefind 索引。一般網站託管仍會由 GitHub 處理連線請求。

## Git 提交者資訊

Git commit 的作者名稱與 email 也會保存在公開歷史裡。發文前可在 GitHub 的 Email 設定確認隱私選項，並為本機 Git 使用 GitHub 提供的 noreply 位址。更改未來的提交身分，不會移除既有 commit 的 email；不要把含 email 的 commit 詳情截圖放進文章。

## 如果已經誤傳憑證

先在該服務撤銷或輪替憑證，讓舊值失效。之後依 GitHub 官方指引清理檔案、Git 歷史、Actions logs/artifacts、發布產物與快取；單純刪除最新檔案不足以移除所有副本。歷史重寫會影響協作者，執行前另行協調。不要在公開 issue 貼出憑證作為證據。

## 維護

Action 直接依賴固定到完整 commit SHA，旁註版本供閱讀。更新時核對上游來源、diff、Node 與 pnpm 相容性，再重新建置驗證；固定版本不代表永遠安全。`pnpm-lock.yaml` 保存解析後的依賴版本，使用 `pnpm install --frozen-lockfile` 重現。

參考：[GitHub Actions 安全使用](https://docs.github.com/en/actions/reference/security/secure-use)、[Astro 環境變數](https://docs.astro.build/en/guides/environment-variables/)、[移除 repository 的敏感資料](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)。
