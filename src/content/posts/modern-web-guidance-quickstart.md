---
title: "Modern Web Guidance 入門實戰：Codex、Claude Code 與 CLI 怎麼接？"
author: Brad
pubDatetime: 2026-11-23T14:26:00+08:00
featured: false
draft: false
category: developer-tools
contentType: tutorial
level: beginner
status: learning
tags:
  - modern-web-guidance
  - agent-skills
  - codex
  - claude-code
  - frontend
description: "從 Node.js 環境檢查、search/retrieve 到 Codex、Claude Code 的安裝與示範 Prompt，整理官方畫面、驗收與排錯方法。"
---

> **系列 02／04｜2026-11-23｜學習整理 + 受限環境試用紀錄。** 官方指令與功能已對照文件；作者所在執行環境的 npm Registry DNS 查詢失敗，因此**沒有宣稱完成 CLI 安裝或 Agent 端對端測試**。下文「預期結果」不是實測紀錄。

## 系列導覽

[01 工具介紹](../modern-web-guidance-overview/) · **02 CLI 操作（本篇）** · [03 舊程式碼升級](../modern-web-guidance-modernization/) · [04 架構與比較](../modern-web-guidance-architecture-evals/)

## 1. 先認識你要安裝的東西

Modern Web Guidance 並不是一個獨立的 IDE。它會把 `modern-web-guidance` Skills 安裝到你已有的 Coding Agent，並提供可搜尋指南的 CLI。

```text
你：幫我做一個能用 Esc 關閉的 Modal
  ↓
Codex / Claude Code / 其他 Agent
  ↓ 依 Skill 指示查找
modern-web-guidance search "confirmation modal dialog"
  ↓
modern-web-guidance retrieve "<guide-id>"
  ↓
Agent 參考具體 API / Fallback 修改程式
  ↓
開啟瀏覽器驗證行為和外觀
```

**這是研究流程示意**；是否能在你的 Agent 自動觸發，取決於 Skills 安裝、啟用、權限與工具版本。

## 2. 系統準備：版本檢查

官方 [Get Started](https://developer.chrome.com/docs/modern-web-guidance/get-started) 推薦 Node.js 22 或更新版本，先在 Terminal 執行：

```bash
node --version
npm --version
```

如果缺少 Node.js，從 [官方 Node.js](https://nodejs.org/en/download) 安裝；不必為了指南而關閉系統安全防護。開發時也建議建立獨立的測試資料夾，以免無意中把公司 Repo 交給新裝的 Agent。

## 3. 不安裝也能先看內容：search → retrieve

最好的第一次練習不是直接把整個 Repo 交給 Agent，而是先找一條相關指南：

```bash
npx modern-web-guidance@latest search "animate a dialog modal backdrop"
```

官方文件有示範此類查詢，並列出像 `animate-to-from-top-layer`、`light-dismiss-a-dialog` 等候選 ID。**依目前 Source 的 Skill 規則，結果通常是精簡的 `id` 與 `description` 清單**；實際欄位會隨版本調整，請以自己的終端機輸出為準。找到正確候選後：

```bash
npx modern-web-guidance@latest retrieve "animate-to-from-top-layer"
```

這應顯示指南 Markdown，包括 API 用法、陷阱與可能需要的 Fallback。不要從另一篇教學複製一個 ID 就直接認定它對你的任務正確，先看搜尋結果的 `description` 是否匹配。

**驗收方法：** `search` 回來的 ID 與目的相符；`retrieve` 能輸出真正的指南，而不是空白或 CLI usage；你能指出一項「原本沒有注意到的」實作限制。

![Google Chrome 官方文件中的 Modern Web Guidance Skills 選擇安裝畫面](https://developer.chrome.com/static/docs/extensions/ai/build-with-ai/image/mwg-chooser_1920.png)

*官方產品畫面（[原文出處](https://developer.chrome.com/docs/extensions/ai/build-with-ai)）：Skills 選擇器可勾選 `chrome-extensions` 與 `modern-web-guidance`。**截圖為官方較早的 0.0.160 版本，並非本文 1.0 的實測畫面**；實際介面、選項可能已有差異。*

## 4. 安裝 Skills 到你的 Coding Agent

最通用的安裝途徑是：

```bash
npx modern-web-guidance@latest install
```

這會開啟互動式安裝精靈。請留意安裝目標是**目前專案**還是**使用者全域環境**；選錯目標可能導致 Agent 在另一個 Repo 找不到 Skill。

不同 Agent 也有官方的安裝方式：

| Agent / 工具 | 官方操作入口 | 成功應檢查什麼？ |
| --- | --- | --- |
| **Codex CLI** | `codex plugin marketplace add GoogleChrome/modern-web-guidance` 然後 `codex plugin add modern-web-guidance@googlechrome` | 外掛／Skill 已列在可用項目，能被任務觸發 |
| **Claude Code** | `claude plugin marketplace add GoogleChrome/modern-web-guidance` 然後 `claude plugin install modern-web-guidance@googlechrome` | Plugin 已啟用，按官方指引重載 |
| **通用 Agent Skills** | `npx skills add GoogleChrome/modern-web-guidance` | 目標 Agent 能讀取 Skill |
| **Gemini CLI** | `gemini extensions install https://github.com/GoogleChrome/modern-web-guidance --auto-update` | Extensions 列表顯示已安裝 |
| **其他 Agent** | 參考官方各工具的 Plugin / Skills 方法 | 不預設所有工具都有相同的原生整合 |

工具的 Plugin 功能和指令名稱會隨產品版本改動，若提示「unknown command」，優先查看 [官方 Get Started](https://developer.chrome.com/docs/modern-web-guidance/get-started)，不要直接照抄較舊部落格。

## 5. 用一個小任務驗證 Agent 是否真的會查指南

在空白測試專案中，給 Agent 以下 Prompt：

> 請建立最簡單的原生 HTML Dialog 範例：開啟按鈕、關閉按鈕、按 Escape 關閉、正確的焦點行為。**在寫程式前，先使用 Modern Web Guidance 搜尋相關指南、說出你選用的 ID 和理由，取回規則，再實作**。請標註支援限制與可行的降級策略。不要新增不必要的 UI 套件。最後提供實際測試步驟與尚未驗證的項目。

如果成功，你應該能看到三段**可檢查的證據**：

1. Agent 真的呼叫 `search`、`retrieve`，而不是只在文字中聲稱參考指南。
2. 程式碼包含符合需求的 `<dialog>` 語意和正確事件處理，而不是只看起來漂亮。
3. 你可以自己在瀏覽器按 Tab、Escape、點擊按鈕，確認行為和焦點沒有壞掉。

比較也可以做成受控的 A/B 實驗：同一個測試 Repo、同一模型／設定，先不啟用 Skill 做一次，再啟用 Skill 重做，記錄結果。**這是建議的實測方法，本文沒有提供假的比較數據**。

## 6. 從搜尋策略提高命中率

官方 [Skill 指引](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/modern-web-guidance/SKILL.md) 建議用 **2–5 個英文詞、描述單一動作**，避免把專案名、框架名和多個不相關任務塞在同一句：

| 不夠好的查法 | 更好的查法 |
| --- | --- |
| `"fix React account page modal z-index"` | `"modal dialog top layer"` |
| `"responsive table dark mode"` | 分開 `"responsive data table"` 與 `"dark mode colors"` |
| `"confirmation before delete user"` | `"confirmation modal dialog"` |

結果不相關時，先換一次更具體的 HTML／CSS 名稱；真的沒有合適指南，就應承認缺少覆蓋，而不是硬套不相關的規則。

## 7. 這次環境的實測邊界，以及排錯

**實際嘗試：**在隔離的 Linux 執行環境檢查了 Node.js `v22.16.0`、npm `10.9.2`，然後執行：

```bash
npm view modern-web-guidance version --fetch-timeout=7000 --fetch-retries=0
```

結果 npm Registry DNS 查詢失敗，錯誤為 `EAI_AGAIN registry.npmjs.org`。因此，**尚未取得套件、尚未真正跑過 `search`／`retrieve`／`legacy-scan`，也沒有實機操作截圖**。此外，本機 Node.js 版本低於 Source Repo 開發要求的 `>=22.18.0`，不適合當作完整 Source Build 的驗證環境。

| 失敗情境 | 優先檢查 |
| --- | --- |
| `EAI_AGAIN` / Registry 連線失敗 | DNS、代理、防火牆、npm Registry；不是指南內容錯誤 |
| `npx` 找不到 | Node/npm 安裝及 PATH |
| Agent 看不到 Skill | 安裝範圍、Skill 目錄、重新載入 Agent |
| `search` 沒有相關 ID | 改用 2–5 個英文詞、查一次同義描述 |
| `retrieve` 拒絕某功能 | 是否為 Origin Trial／volatile API，先確認支援政策 |
| 生成程式與指南不一致 | 要求 Agent 說出實際使用的指南與測試證據 |

## 重點回顧

- **先探索，再安裝**：`search` 找候選，`retrieve` 才取得完整指南。
- 不同 Agent 的 Plugin 安裝方式不同；別把 `-src` Repo 當成一般用戶要 Clone 的套件。
- 要求 Agent **提供真實工具呼叫和測試結果**，不能只說「我用了官方指南」。
- 本次網路限制阻擋 npm 安裝，故本文提供的是**可重現的操作手冊與實際排錯紀錄**，非成功實測截圖。

**上一篇：** [Modern Web Guidance 是什麼？](../modern-web-guidance-overview/)　｜　**下一篇：** [用 legacy-scan 整理舊程式碼](../modern-web-guidance-modernization/)

**來源：** [Chrome 官方 Get Started](https://developer.chrome.com/docs/modern-web-guidance/get-started) · [官方 Skills CLI](https://github.com/GoogleChrome/modern-web-guidance) · [Skill Instructions](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/modern-web-guidance/SKILL.md) · [官方安裝器截圖](https://developer.chrome.com/docs/extensions/ai/build-with-ai)
