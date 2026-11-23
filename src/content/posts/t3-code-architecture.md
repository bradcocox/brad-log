---
title: "T3 Code 架構解析：為什麼 Coding Agent 可以跨裝置持續運作？"
author: Brad
pubDatetime: 2026-11-23T09:00:00+08:00
featured: false
draft: false
category: developer-tools
contentType: reading
level: advanced
status: learning
tags:
  - t3-code
  - coding-agent
  - agent-orchestration
description: "從主機與 Client 邊界、Authenticated RPC、Provider Adapter、Event Sourcing、Projection、Outbox 及 Git Worktree 理解 T3 Code。"
---

> **系列 03／04｜2026-11-23 原始碼與官方設計文件閱讀，非效能實測。** 本文聚焦架構的設計取捨，不等於以壓測或故障注入證實每個實作承諾。

## 系列導覽

[01 介紹](../t3-code-overview/) · [02 安裝教學](../t3-code-quickstart/) · **03 架構（本篇）** · [04 競品比較](../t3-code-comparison/)

## 1. 第一條邊界：工作空間屬於 Server

T3 Code 不會讓手機變成另一個獨立的開發環境。依據 [Architecture](https://github.com/pingdotgg/t3code/blob/main/docs/internals/overview.md)，真正的 Provider Process、Terminal、Git 和檔案都屬於 **Server**；桌面、瀏覽器與手機 Client 透過帶有認證的 RPC 操作它。

```text
Desktop Client ─┐
Web Client ─────┼── Authenticated RPC ── T3 Server
Mobile Client ──┘                          │
                               ┌───────────┼───────────┐
                           Provider     Project/Git   Terminal
                           adapters      Worktree     processes
                               │
                      Claude / Codex / OpenCode ...
```

*圖 1：依官方 Architecture 繪製的**概念示意**，不是程式內的逐一服務拓撲，也不代表 Client 可以直接存取 Provider 憑證。*

這個界線有兩個好處：手機不需要知道主機的私有專案路徑或模型認證；多個 Client 看到的是同一個主機管理的 Thread。代價則是：主機如果不可用，Client 不能自行接管執行。

## 2. 第二條邊界：RPC 和 Provider Adapter

官方將客戶端與 Server 的合約放在 [`packages/contracts/src/rpc.ts`](https://github.com/pingdotgg/t3code/blob/main/packages/contracts/src/rpc.ts)。協定要兼顧不同版本的 Client 與 Server；登入 Socket 也不代表可以執行每一項方法，還要獨立授權。

Provider 特有的工作則應留在 Adapter 後面，避免 Domain Logic 因 Claude、Codex、OpenCode 的個別差異而到處塞判斷。

| 位置 | 責任 | 主要設計原因 |
| --- | --- | --- |
| Client Runtime | 共享連線與 UI 相關的 Domain State | 桌面、Web、手機重連行為一致 |
| RPC Contract | 定義 Client 與 Server 的訊息格式 | 跨版本與權限邊界 |
| Provider Adapter | 處理特定 Agent 的能力與事件 | 降低新增 Provider 的耦合 |
| Server Domain | Thread、工作流程與狀態演進 | 統一管理與回復 |

更多細節可讀 [Connection Runtime](https://github.com/pingdotgg/t3code/blob/main/docs/internals/connection-runtime.md) 與 [Provider Constraints](https://github.com/pingdotgg/t3code/blob/main/docs/internals/providers.md)。

## 3. 為什麼需要 Event Sourcing 和 Outbox？

這是整個專案最值得 System Design 讀者研究的部分。文件描述的 **v2 Orchestrator** 不是接到指令就直接執行所有外部 I/O，而是先序列化指令、決定 Event，再在單一資料庫 Transaction 內提交 Event、Projection、Command Receipt 和 Outbox Effect。

```text
Client Command
    ↓
Orchestrator: decide events (no external I/O)
    ↓
Database transaction
    ├── Append events
    ├── Update projections
    ├── Save command receipt
    └── Persist outbox effects
    ↓ commit
Effect Worker → Provider / filesystem / checkpoint
    ↓
Result feeds back to Orchestrator
```

*圖 2：依 [官方 Architecture](https://github.com/pingdotgg/t3code/blob/main/docs/internals/overview.md) 整理的指令處理流程。重點是「接受意圖」和「副作用已完成」不是同一件事。*

這種安排在 Agent 系統很實用：

- Command 重送不應重複執行同一個不可逆動作，所以要有 **idempotent receipt**。
- Client 應在資料庫成功 Commit 後才收到狀態更新，避免看見比正式資料更前面的結果。
- Provider 執行或檔案處理可能失敗，於是需要可追蹤、可回報結果的 Effect Worker。
- 跨機重連的 Client 需要 Replay 或 Snapshot，而不應一次讀取所有歷史內容。

但別把它理解成「所有操作一定可以無限重跑」：文件明確指出綁定已遺失 Provider Process 的 Effect 不能簡單 Replay，必須先做恢復處理。

## 4. Replay 並非永久保存所有事件

官方文件指出 V2 Event Log 大致保留一天左右、主要滿足重連與 Command-ID Retry。舊 Event 經 Projection Maintenance 清除，持久化 Projection 並不是每次都能從剩餘 Log 完整重建。

這是對 **Event Sourcing** 很有價值的提醒：即使系統使用 Event Log，也不代表它等於無期限的 Event Store。文中紀錄的 Stream High-Water Mark、版本及特例保留規則，用來判定何時應以 Snapshot 恢復。

對自己的系統，可以問：**你的事件保留期、Projection 重建策略與 Client Replay 契約，有沒有一起設計？**

## 5. Git Worktree 不是附帶功能，而是 Agent 並行的基礎

T3 Code 的 Thread 能使用專屬的 Git Worktree，讓不同 Agent 在不同 Branch 上工作，減少互相覆蓋。但 Worktree 共享 Repo 的物件資料和某些 Git State，它不是 Container 或 VM。

官方的 [Checkpoints](https://github.com/pingdotgg/t3code/blob/main/docs/internals/overview.md#turn-completion-and-checkpoints) 使用隱藏 Git Ref 保存狀態，不必在你的使用者 Branch 產生多餘 Commit。文件甚至描述多 Repo 專案中，只有被某 Turn 修改的 Repo 才需要建立相應 Snapshot。

另一個需要區分的概念是：**Provider Turn 已結束，不等於後續 Checkpoint、Diff、PR 查找都完成**。因此 UI 不能把背景整理時間混成 Agent 正在思考的時間。

## 6. 這些設計可借鏡到哪裡？

即使不使用 T3 Code，設計自己的 AI Agent 平台時也能參考：

| 情境 | 值得借鏡的設計 |
| --- | --- |
| 手機與桌面同步同一任務 | Server 擁有工作空間，Client 只保有授權過的操作能力 |
| 多 Provider 整合 | Adapter + 正規化事件 |
| Agent 任務重試 | Durable Receipt + Idempotency Key |
| 長時間工作 | Outbox + Effect Worker + 明確工作完成狀態 |
| 多 Agent 改同一份 Repo | Worktree + Diff + Checkpoint |
| Client 斷線再接 | Snapshot / Replay / Cursor 追蹤 |

不過具體效能與恢復可靠度仍需要實際測試，包括 Network Partition、Provider Crash、重複 Command、Checkpoint 回復等。這些是**建議的測試項目**，不是本文的實測結果。

## 重點回顧

- T3 Code 將 Server 與 Client 的責任嚴格分開。
- 統一介面仰賴 RPC Contract 與 Provider Adapter。
- Orchestrator、Event、Projection、Outbox 將意圖提交與外部副作用拆開。
- Git Worktree 和 Checkpoint 服務於並行與可回復性，但不是完整沙箱。
- 系統的「完成」至少有 Provider Turn、後續工作結算等不同里程碑。

**上一篇：** [從零安裝與遠端操作](../t3-code-quickstart/)　｜　**下一篇：** [T3 Code 競品比較](../t3-code-comparison/)

**研究來源：** [Architecture](https://github.com/pingdotgg/t3code/blob/main/docs/internals/overview.md) · [RPC Contract](https://github.com/pingdotgg/t3code/blob/main/packages/contracts/src/rpc.ts) · [Source Control](https://github.com/pingdotgg/t3code/blob/main/docs/user/source-control.md) · [GitHub Repository](https://github.com/pingdotgg/t3code)
