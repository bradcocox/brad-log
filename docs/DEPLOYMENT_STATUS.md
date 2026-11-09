# 部署交接狀態

紀錄日期：2026-11-09（Asia/Taipei）。

## 已完成

- AstroPaper 7.1.0 原始碼匯入、Brad.log 品牌與繁體中文。
- 六領域分類、真實文章數與空狀態、文章篩選與時間彙整。
- 初學者教學全文、四張說明圖、經裁切的 Pages 設定實拍。
- README、SETUP.md 與 SECURITY.md 保存設定、理由、更新與安全規則。
- 本機完整建置：19頁，Astro check 67檔案，0 errors／warnings／hints。
- Pagefind 索引：zh-tw、1篇、2個篩選欄位。
- 靜態連結檢查：19頁內部路徑與5張圖片目標均存在。
- 原始內容與產出文字的常見憑證模式掃描通過；代表性測試確認阻擋且不印出匹配值。
- GitHub repo 的 Pages Source 已設為 GitHub Actions，預設網域要求 HTTPS。

## 尚未完成，不能視為已上線

- 專案程式尚未寫入遠端 repo。GitHub整合寫入回傳403；本機Chrome檔案選擇／上傳流程逾時。
- 尚無成功的線上 Actions build/deploy紀錄，因此尚未驗證正式網站。
- 正式站的桌機／手機、搜尋、分類、圖片放大與主題切換待驗證。
- actions-success.png 與 site-home.png 待真正上線後拍攝；文章只留HTML註記，沒有假截圖或破圖連結。
- 首文status暫列learning；完成全流程實際驗證後再改verified。

## 接續順序

1. 依Browser檔案上傳指引確認Chrome擴充功能可存取檔案網址；必要時由使用者完成權限設定。
2. 使用已授權方式把此專案檔案寫入既有bradcocox/brad-log，保留既有.git歷史，不強制推送。
3. 確認main上的.github/workflows/deploy.yml與鎖定檔完整。
4. 等待Publish Brad.log的build與deploy均成功，再開啟正式網址。
5. 用本機Chrome測試桌機／手機、搜尋、分類篩選、主題、圖片及內文。
6. 拍攝安全的實際成功畫面，補入首文，再建置與發布。

預定正式網址：https://bradcocox.github.io/brad-log/ 。本文件只記錄狀態，不保證此網址目前已上線。
