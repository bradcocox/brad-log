---
title: "T3 Code 是什麼？一個介面管理 Claude Code、Codex 與 OpenCode"
author: Brad
pubDatetime: 2026-11-23T09:00:00+08:00
featured: true
draft: false
category: developer-tools
contentType: reading
level: beginner
status: learning
tags:
  - t3-code
  - coding-agent
  - claude-code
  - codex
  - opencode
  - agent-orchestration
description: "從多個 Coding Agent 的操作痛點出發，理解 T3 Code 為何不是模型或另一個 Agent，而是整合工作階段、Git 與手機遠端控制的開源介面。"
---

> **系列 01／04｜研究日期：2026-11-23｜驗證狀態：官方文件與原始碼研究，非親自安裝實測。** 本系列以每篇 5–10 分鐘為目標。功能與介面以查閱日為準；產品快速更新，請以官方文件確認。

## 這個系列怎麼讀？

| 章節 | 文章 | 讀完可以做到什麼 |
| --- | --- | --- |
| 01（本篇） | **T3 Code 是什麼？** | 分清模型、Agent 與控制平台 |
| 02 | [從零開始安裝、連接 Agent 和手機遠端操作](../t3-code-quickstart/) | 建立第一次受控操作流程 |
| 03 | [架構解析：RPC、事件與 Git Worktree](../t3-code-architecture/) | 理解跨裝置與執行狀態如何運作 |
| 04 | [和 Conductor、Happy 比較怎麼選](../t3-code-comparison/) | 依需求做工具選型 |

## 1. 為什麼會需要 T3 Code？

假設同一個專案中，你用 **Claude Code** 研究需求、用 **Codex** 改一個 API，再用 **OpenCode** 嘗試另一款模型。很快就會遇到三個問題：

1. 每個工具的操作入口、執行紀錄與權限提示各不相同。
2. 多個任務同時修改專案，必須管理不同 Branch、Worktree 和 Diff。
3. 離開電腦後，Agent 停在「等待確認」的畫面，手機無法輕鬆接手。

[T3 Code](https://github.com/pingdotgg/t3code) 想改善的是**操作與管理 Agent 的體驗**，不是重新發明另一個 AI 模型。它把多種已存在的 Agent 整合到一個介面中，讓使用者以同一種方式查看 Thread、核准操作、比較修改，並從別的裝置繼續。

![T3 Code 官方產品畫面：桌面上的 Agent 工作 Thread 與手機端的核准操作](https://raw.githubusercontent.com/pingdotgg/t3code/main/.github/readme/hero.webp)

*圖 1：T3 Code 官方 README 提供的真實產品畫面（[原始出處](https://github.com/pingdotgg/t3code/blob/main/.github/readme/hero.webp)），不是作者實測截圖。請注意桌面 Thread 和手機核准提示分別代表「執行」與「遠端操作」兩種工作。*

## 2. 先釐清：模型、Harness、控制平台差在哪？

| 層次 | 常見例子 | 負責的工作 |
| --- | --- | --- |
| **LLM 模型** | Claude、GPT 等 | 理解需求、規劃、產生程式碼或工具呼叫 |
| **Agent / Harness** | Claude Code、Codex、OpenCode | 給模型讀檔、改檔、執行命令等工具與執行循環 |
| **控制平台** | **T3 Code** | 顯示與操作多個 Agent 的 Session、批准請求、管理工作空間 |
| **原始碼版本控制** | Git、GitHub | 留存變更、審核 Diff、建立 PR |

官方 [FAQ](https://github.com/pingdotgg/t3code/blob/main/docs/user/faq.md) 說得很清楚：**T3 Code 不是 Harness，不能在沒有 Agent 的情況下自己完成 Coding Agent 工作。**

這也代表：**安裝 T3 Code，不等於免費取得 Claude、Codex 或其模型額度。** T3 Code 以你已登入或設定的 Provider 來工作；相應訂閱、API 使用限制與費用仍須另外確認。

## 3. 主要功能，不只是一個聊天視窗

| 功能 | 能解決的問題 | 應注意的限制 |
| --- | --- | --- |
| 多 Provider 統一管理 | 在同一介面使用 Claude、Codex、OpenCode、Cursor 等 | 先在執行端安裝與驗證各 Provider |
| Thread 與跨 Agent 接續 | 一個工作脈絡可交由不同 Agent 處理 | 實際可用的模型與跨 Provider 接續能力有相容性前提 |
| Git Worktree、Diff、PR | 同時開發多個任務，減少互相覆蓋 | Worktree 不是容器或完整安全隔離 |
| 桌面、Web、iOS、Android | 外出時查看進度、回覆核准要求 | 執行端電腦或伺服器要保持運作 |
| 區域網路、Tailscale、T3 Connect | 不一定要回到本機才能操作 Agent | 需處理配對、連線可及性與權限 |
| ACP Provider 整合 | 透過通用協定擴大可接的 Agent 類型 | 第三方 ACP Agent 應審查原始碼與授權 |

這些能力來自 [README](https://github.com/pingdotgg/t3code/blob/main/README.md)、[ACP 文件](https://github.com/pingdotgg/t3code/blob/main/docs/user/providers-acp.md) 與 [Source Control 文件](https://github.com/pingdotgg/t3code/blob/main/docs/user/source-control.md)，不是本文自行跑出的效能評測。

## 4. 一個具體場景：把三個工具變成同一條工作流程

想像你正在改一個 FastAPI 專案：

1. 在 T3 Code 建立一個專屬 Thread，先確認它的工作目錄和 Branch。
2. 交給 Claude Code 解讀既有 API 與測試。
3. 視 Provider 支援情況，將後續工作交給 Codex 或同一 Provider 的另一模型。
4. 從 T3 Code 的 Diff 檢查改動，在真正的開發環境跑測試。
5. 若出門時 Agent 提出需要核准的動作，再從手機審核，不必直接操作遠端 Shell。
6. 最後由你判斷要不要 Commit、Push 和開 PR。

**這是示範的預期流程，不是本篇已完成的端對端測試。** 對企業專案仍要遵守內部程式碼、憑證與 AI 使用規範。

## 5. 你可能忽略的三個重要限制

### 權限不是預設最保守

官方 [Permission Modes](https://github.com/pingdotgg/t3code/blob/main/docs/user/permission-modes.md) 記載，新 Thread 的初始預設為 **Full access**。第一次練習更建議切到 **Supervised**，讓寫檔與執行命令先請求確認。這不是萬能沙箱，Provider 的具體執行方式仍有差異。

### 手機不是在手機裡執行 Agent

手機只是控制端。Provider Process、Git、Terminal、工作目錄都屬於執行環境。電腦關機、伺服器停止或失去連線時，手機不能憑空讓任務繼續。

### 快速發展不等於沒有 Bug

2026-11-23 的 GitHub 更新仍很頻繁，但也存在與 Provider 身分驗證、Session 中斷有關的 Issue，例如 [#41195](https://github.com/pingdotgg/t3code/issues/41195) 回報 macOS Claude Provider 認證探測失敗。這是**個別環境的使用者回報**，不代表所有安裝都會出問題。

## 6. 哪些人值得試？哪些人不一定需要？

如果你**同時使用兩個以上 Coding Agent**、管理多個工作目錄、想從手機接手等待確認的任務，T3 Code 的定位很有吸引力。

如果你只在一台電腦用一種 CLI，沒有多個任務或遠端需求，那麼多一層管理平台不一定更簡單。原生 Claude Code、Codex 或 OpenCode 可能已經夠用。

## 重點回顧

- **T3 Code 是 Coding Agent 的開源控制平台，不是模型或新的 Harness。**
- 它的價值在多 Provider、跨裝置 Session 與 Git 工作流的整合。
- 使用自己的 Provider 登入不代表取得額外的免費模型額度。
- 想安全開始，先理解 **Supervised 權限** 和執行環境邊界。
- 下一篇會從真正可照做的安裝與驗收清單開始。

**下一篇：** [T3 Code 從零開始：安裝、連接 Agent 與遠端控制](../t3-code-quickstart/)。

## 研究來源

- [T3 Code 官方 GitHub README](https://github.com/pingdotgg/t3code/blob/main/README.md)
- [官方 FAQ：T3 Code 是否為 Harness？](https://github.com/pingdotgg/t3code/blob/main/docs/user/faq.md)
- [Permission Modes](https://github.com/pingdotgg/t3code/blob/main/docs/user/permission-modes.md)
- [Remote Access](https://github.com/pingdotgg/t3code/blob/main/docs/user/remote-access.md)
- [GitHub Issues](https://github.com/pingdotgg/t3code/issues)
