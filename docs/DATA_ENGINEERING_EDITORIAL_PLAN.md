# Brad.log｜Data Engineering 熱門選題與編輯規劃

查核：2026-11-16（Asia/Taipei）

## 與既有內容的分工

- `brad-log`：公開、面向初學者的圖文教學、實作與架構討論。既有 7 篇以 Coding Agent 與 GitHub Pages 為主；本次補入 3 篇 Data Engineering。
- `bradcocox/de-tech`：較短的技術快訊與來源筆記；已涵蓋 JSON→typed columns、Airflow Common AI Provider 1.0、ClickHouse × Iceberg 冷熱分層。新長文避免照搬快訊，而要提供自己的比較、實作或批判性問題。

## 本期已完成文章

| 文章 | 主要讀者問題 | 討論度證據 | 驗證 |
| --- | --- | --- | --- |
| Polars 2.0 Streaming 預設 | 升級後如何避免隱性順序依賴？ | [r/dataengineering 發布討論](https://www.reddit.com/r/dataengineering/comments/1wz10m5/python_polars_20_release/) 約 358 票（查閱時） | Polars 2.0.0 小型實驗及斷言已執行 |
| DuckDB 2.0 Server／Agent／VARIANT | 新版是否改變資料庫選型？ | [HN 關注趨勢](https://hackernewstrends.com/trends/duckdb) 收錄 2.0 討論約 461 票、62 則留言（彙整數值可能變動） | DuckDB 2.0.0 的 VARIANT 本機實驗已執行；Quack/Agent CLI 未實測 |
| Airflow 3.4 Task Loops／多語言／AI | 能否用一個 Orchestrator 負責更多工作？ | [官方 11/6 發布](https://airflow.apache.org/blog/airflow-3.4.0/)；目前僅列技術新聞價值，未證實有同等社群互動熱度 | 文件整理，未部署 |

## 候選下一篇（尚未寫作）

### A. ClickHouse × Amazon S3 Tables：查 Iceberg 可以不用複製資料嗎？

- 事件：[AWS 11/10 文章](https://aws.amazon.com/blogs/storage/bring-high-performance-analytics-to-your-lakehouse-with-clickhouse-and-amazon-s3-tables/) 和 [ClickHouse 11/11 文章](https://clickhouse.com/blog/clickhouse-amazon-s3-tables)。
- 文章角度：S3 Tables 直接讀寫與先匯入 MergeTree 的延遲／成本／一致性差異；拆解供應商宣傳與實測條件。
- 初學者練習：可先用本地資料畫出兩條路徑；若要真正操作 AWS，必須事先標明帳號、IAM、可能產生的費用，不以免費為由默認零支出。
- 避免重複：`de-tech` 的 10/14 Ridgeline 冷熱分層是不同架構案例；本篇應強調 S3 Tables 的 Catalog 與雙向讀寫。

### B. Polars vs DuckDB：誰比較快，不如先問你的工作負載是什麼

- 背景：兩者 2026 年 10 月均發布大版本；[Polars 官方基準測試](https://pola.rs/posts/release-polars-2/)採特定機型、查詢和版本，不能當中立通用排名。
- 文章角度：使用相同資料、相同查詢、相同執行環境，記錄時間、峰值記憶體、結果一致性、學習成本；另比較 Python API vs SQL 的維護性。
- 驗證要求：有正式測試腳本與產生的原始數據後，再撰寫結論，否則只發布「如何公平比」的方法文章。

### C. Apache Iceberg Catalog：為什麼資料引擎都在談開放表格格式？

- 背景：[AWS S3 Tables 的 Hive→Iceberg 遷移功能](https://aws.amazon.com/blogs/aws/amazon-s3-tables-now-offer-managed-migration-of-apache-hive-tables-to-apache-iceberg/)（2026-11-04）。
- 文章角度：Parquet 檔、Iceberg table metadata、Catalog、Snapshot、Transaction 之間究竟怎樣協作。
- 初學者視覺：附實際資料目錄／Metadata 示意，說清楚「只是 Parquet」和「可交易的 Iceberg Table」差在哪。

## 文章品質門檻

1. 先核對官方發布日期、版本、Breaking Changes 與功能成熟度；必要時明示官方文件互相矛盾之處。
2. 社群票數只作「討論度訊號」，不當作產品技術優劣的證據；記錄查閱日。
3. 每篇開頭有一個真正的工作問題，核心段落有圖解、操作結果或可驗證的例子，結尾有值得讀者回答的問題。
4. 所有示意圖標「自製示意」，所有官方截圖標來源，未實測流程明示「學習整理」。
5. 程式碼至少測試一次、附版本和可重現的命令；若不能測試，嚴禁把預期結果寫成實測。
6. 安全與成本不假設：測試資料不含秘密、帳號與客戶內容；正式雲端實驗先說明計費與權限。
7. 新文先檢查 `src/content/posts/`、`de-tech` 索引，避免重複同一個消息；必要時建立系列互連。

下次選題可優先考慮 A，因它有 11 月的最新一手教學來源；B 需要先建立公平 benchmark，不能草率發布勝負結論。
