---
title: "Modern Web Guidance legacy-scan：讓舊前端升級，又不盲目改寫"
author: Brad
pubDatetime: 2026-11-23T14:27:00+08:00
featured: false
draft: false
category: developer-tools
contentType: tutorial
level: intermediate
status: learning
tags:
  - modern-web-guidance
  - legacy-scan
  - frontend
  - code-modernization
  - browser-compatibility
description: "學習透過 legacy-scan 找出值得升級的 Web 實作，理解 AST 掃描、keepWhen/dropWhen、防誤判、Baseline 與實際重構驗收。"
---

> **系列 03／04｜2026-11-23 官方文件與規則研究，非 CLI 成功實測。** 本篇所有「範例命中結果」都是教學情境，不是假裝從實際 Repo 跑出的掃描報告。讀者應先備份並建立分支，再進行任何改寫。

## 系列導覽

[01 核心介紹](../modern-web-guidance-overview/) · [02 安裝教學](../modern-web-guidance-quickstart/) · **03 legacy-scan（本篇）** · [04 架構與評測](../modern-web-guidance-architecture-evals/)

## 1. 為什麼不能直接要求 AI「幫我把所有前端改成最新」？

在實務上，有些「舊寫法」其實是刻意保留的 Fallback。有些元件在現有瀏覽器完全正常；如果硬把它們改成較新的 API，反而可能讓舊版 Safari、企業內嵌 WebView 或自動化測試壞掉。

Modern Web Guidance 1.0 加入的 `legacy-scan`，不是把所有 CSS 丟給 LLM 猜，而是先用**本機靜態規則**找出有明確對應的舊式 Web Pattern，再把每項候選交給 Agent 做情境判斷。

官方 [Modernization Workflow](https://developer.chrome.com/docs/modern-web-guidance/modernization-workflow) 明確說明：掃描涵蓋的只是一部分指南，約 **20% 有可確定辨認之舊模式的內容**；因此**零結果不等於程式碼完全符合現代 Web 最佳實務**。

## 2. 先取得候選，再決定要不要動手

最保守的起手式是**先只掃描、不修改**：

```bash
# 先在你自己的前端專案目錄
git status --short
git switch -c chore/modern-web-review

# 以 JSON 取得候選命中
npx modern-web-guidance@latest legacy-scan . --json
```

第一條命令若顯示未提交的變更，先理解哪些是你自己的工作；不要直接讓 Agent 覆寫。第二條會建立新 Branch（若名稱已存在，請換一個），讓後續重構容易 Review。

若你不想一次檢查整個 Monorepo，可只掃某個目錄，例如：

```bash
npx modern-web-guidance@latest legacy-scan src/components --json
```

**預期結果：**工具回報可能改善的檔案位置、對應指南 ID 及供 Agent 檢查的條件；具體 JSON 結構依版本決定。沒有命中時，先確認掃描路徑與支援的檔案類型，別把「沒有輸出」誤解成「所有程式已過檢」。

## 3. 掃描器如何降低誤判？

它的分工可以理解成四步：

| 階段 | 做什麼？ | 還不能下的結論 |
| --- | --- | --- |
| **Scan** | 以程式規則比對 HTML、CSS、JS/TS 等候選 Pattern | 命中就是 Bug |
| **Verify** | 依 `keepWhen`／`dropWhen` 看周邊脈絡 | 所有舊語法都應刪掉 |
| **Report** | 列出確實值得改善的內容、風險與建議 | 可以直接大規模取代 |
| **Modernize** | 取回對應指南、修改、執行測試、再掃描 | 掃描為零就代表行為正確 |

例如偵測到一段「使用 `scrollHeight` 控制輸入框高度」程式，可能只是舊式的自動長高 Textarea 寫法，也可能是刻意實作的虛擬清單或捲動需求。**單憑一行程式碼，掃描器不能知道你的真正意圖。**

官方使用 `keepWhen`／`dropWhen` Rubric 引導 Agent 進一步看脈絡，包括已存在的 `@supports` 容錯、Fallback 和看起來相似但目的不同的程式。

## 4. 用一個 Textarea 範例理解「現代化」與 Fallback

以下是**本篇教學自行整理的示意範例**，沒有宣稱 `legacy-scan` 一定會對它產生特定 ID。

### 舊版常見想法：用 JS 每次手算高度

```js
const textarea = document.querySelector("textarea");
textarea.addEventListener("input", () => {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
});
```

在合適的瀏覽器支援範圍內，可以研究 CSS `field-sizing: content` 來簡化自動長高需求：

```css
textarea {
  min-block-size: 5rem;
  max-block-size: 16rem;
  resize: vertical;
}
@supports (field-sizing: content) {
  textarea {
    field-sizing: content;
  }
}
```

但**這段 CSS 不是等價替換保證**：不支援 `field-sizing` 的瀏覽器仍會使用固定／可手動調整高度，是否允許這種 UX 差異，要依專案要求決定。若「自動長高」是必要功能，不能只靠這個 Fallback；你可能要保留 JS 作條件降級。

這正是 Modern Web Guidance 的價值：**不是把程式碼行數縮短就算成功，而是把行為、瀏覽器支援和用戶需求一起評估。**

可參考 [Web Features: field-sizing](https://web-platform-dx.github.io/web-features-explorer/features/field-sizing/) 查詢當前相容性資料。

## 5. 先 Review，再交給 Agent 修改

我會建議給 Agent 這段 Prompt：

> 請先使用 Modern Web Guidance 的 `legacy-scan` 檢查 `src/components`，**只整理報告，不修改任何檔案**。逐一根據 `keepWhen`／`dropWhen` 核對上下文，辨認現有 Fallback、`@supports` 和業務需求。每個建議要附檔案位置、舊寫法的風險、對應指南 ID、Baseline 支援狀態、是否值得修改及必要測試。優先處理風險低、收益高的項目，並在我 Review 後才開始重構。

確認每個變更必要性後，才請 Agent `retrieve` 指南、改最小範圍、執行測試。

| 驗收項目 | 要看什麼？ |
| --- | --- |
| 功能 | 原本操作正常的頁面仍正常 |
| 相容性 | 目標 Chrome／Firefox／Safari／WebView 是否符合要求 |
| 互動 | Tab、Escape、點擊／觸控、焦點和可視狀態 |
| 效能 | 有量測再宣稱 LCP、INP、CLS 改善 |
| Diff | 沒有無關的格式化、套件替換或多餘刪除 |
| 回歸 | 原專案的單元、E2E 與視覺測試通過 |

## 6. 大型 Monorepo 要注意掃描上限

2026-11-20，原始碼 Repo 有一筆更新：為 `legacy-scan` 增加 `--max-files` 選項與部分覆蓋報告。這是因為過去有人回報預設約 5,000 檔的上限可能讓大 Repo 只掃到前面一部分，卻被誤讀成完整掃描。參考 [Issue #3596](https://github.com/GoogleChrome/modern-web-guidance-src/issues/3596) 和 [修正 Commit](https://github.com/GoogleChrome/modern-web-guidance-src/commit/634d0f83bb41092832797411d148350196b8258d)。

**注意版本差異**：Source 已修正不等於你安裝的 npm 版本一定已包含。先查：

```bash
npx modern-web-guidance@latest legacy-scan --help
```

如果當前 CLI 提供 `--max-files` 才依需求使用；不支援時改分目錄掃描、確認輸出的覆蓋範圍。**不要把 0 findings 當作無技術債保證。**

## 7. 和傳統 Linter、完整 Code Audit 有何不同？

ESLint、Stylelint 偏向檢查**可形式化的程式規則與一致性**；`legacy-scan` 關注的是「已有哪個現代 Web 平台 API 可能能取代特定舊實作」，並用指南補上上下文判斷。

它不是 TypeScript 型別檢查器、資安掃描器，也不能取代網頁執行時的瀏覽器驗證。最好的工作流是三者互補：

**靜態規則找候選 → 人工／Agent 審核必要性 → 小範圍重構與測試。**

## 重點回顧

- `legacy-scan` 只檢查具有明確靜態特徵的部分指南，**不能代表全量稽核**。
- 候選結果要透過 `keepWhen`／`dropWhen` 排除有意保留的兼容邏輯。
- 現代化最重要的是**維持行為與跨瀏覽器相容性**，不是追求最短程式碼。
- 大型 Repo 要看掃描範圍，上限參數是否可用則依實際 CLI 版本確認。
- **下一篇：** [搜尋機制、Evals 與 DevTools MCP 的搭配](../modern-web-guidance-architecture-evals/)。

**上一篇：** [安裝與 CLI 教學](../modern-web-guidance-quickstart/)　｜　**返回起點：** [Modern Web Guidance 是什麼？](../modern-web-guidance-overview/)

**資料來源：** [官方 Modernization Workflow](https://developer.chrome.com/docs/modern-web-guidance/modernization-workflow) · [Skill 規範](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/modern-web-guidance/SKILL.md) · [Issue #3596](https://github.com/GoogleChrome/modern-web-guidance-src/issues/3596) · [Source commit](https://github.com/GoogleChrome/modern-web-guidance-src/commit/634d0f83bb41092832797411d148350196b8258d)
