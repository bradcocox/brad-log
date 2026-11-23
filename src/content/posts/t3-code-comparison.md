---
title: "T3 Code vs Conductor vs Happy：Coding Agent 管理平台怎麼選？"
author: Brad
pubDatetime: 2026-11-23T09:00:00+08:00
featured: false
draft: false
category: developer-tools
contentType: reading
level: intermediate
status: learning
tags:
  - t3-code
  - coding-agent
  - agent-orchestration
description: "以多 Agent 管理、手機控制、Git 工作流、權限、成本與使用者體驗比較 T3 Code、Conductor 和 Happy。"
---

> **系列 04／04｜研究日期 2026-11-23｜文件與社群訊號比較，不是同機 Benchmark。** 各項產品持續更新；沒有實測的速度、記憶體或穩定性數據不會給出排名。

## 系列導覽

[01 T3 Code 是什麼？](../t3-code-overview/) · [02 入門教學](../t3-code-quickstart/) · [03 架構解析](../t3-code-architecture/) · **04 工具比較（本篇）**

## 1. 先決定你真正想解決的問題

「哪個 Coding Agent 管理工具最好？」是個容易問錯的問題。你可能真正需要的是以下其中一種：

- **多 Provider 統一管理：** 同時使用 Claude、Codex、OpenCode，且希望在同一介面操作。
- **多任務並行：** 幾個 Coding Agent 分別修改不同 Feature、Branch，避免互相干擾。
- **手機遠端接手：** 只想在離開電腦時查看進度或核准命令。
- **高度可控：** 希望知道 Provider 在哪裡跑、憑證在哪裡，以及連線方式如何限制。

這些需求並不等價。T3 Code、Conductor、Happy 與原生 CLI 的設計重點也不完全相同。

## 2. T3 Code 的定位

[T3 Code](https://github.com/pingdotgg/t3code) 是開源、以多 Provider 為核心的 Agent 控制介面。官方目前列出 Claude Code、Codex、OpenCode、Cursor 與 ACP Agent 等整合，並支援 Desktop、Web、iOS、Android、Git Worktree、Diff、PR 和遠端連線。

如果你要研究這些功能的技術實作，可接著讀 [系列 03：架構解析](../t3-code-architecture/)。

## 3. Conductor 與 Happy 為什麼值得一起看？

[Conductor](https://www.conductor.build/) 常被拿來討論桌面端同時管理多個 Coding Agent 工作的使用體驗，特別是多 Workspace、Branch／Worktree 及審閱工作流。它更值得從**平行開發的操作效率**切入，而不是拿手機遠端控制當主要比較點。

[Happy](https://github.com/slopus/happy) 同時提供手機、Web 與桌面端的多 Agent 使用方式。原始 CLI 以**從手機遠端操控現有 Coding Agent**著稱；目前的 Happy Desktop／Happy Harness 也支援多模型、協作與端對端加密的手機連線。因此不應把它簡化為只有手機遠端控制的工具。

這裡比較的是各產品的**產品定位和已公開功能**，不推論它們一定完整支援彼此的全部 Provider 或每個平台。

## 4. 需求導向比較表

| 需求 | T3 Code | Conductor | Happy |
| --- | --- | --- | --- |
| 主要定位 | 多 Provider 控制平台 | 桌面多 Agent 工作管理 | 跨裝置多 Agent 平台，原始 CLI 著重手機遠端 |
| 多 Provider 整合 | 官方列出 Claude、Codex、OpenCode 等 | 官方列出 Claude、Codex、Cursor、OpenCode | 官方列出 Claude、Codex、Grok、Gemini 等，OpenCode 可經 ACP 整合 |
| 手機接手任務 | 官方 iOS、Android App | 非官方文件主要介紹的核心能力 | 官方 iOS、Android App，支援加密同步 |
| Git Worktree / Diff | 官方文件完整描述 | 官方明確採 Worktree 隔離各 Workspace | 需另依桌面版本與工作模式核對 |
| 部署與控制 | 本機 Server；LAN、Tailscale、T3 Connect | macOS 桌面工作區 | 官方跨裝置架構包含 CLI、桌面 App、手機與 Relay |
| 費用 | App 開源 MIT；Provider 使用成本另計 | 官方當下定價與授權須另查 | 查看官方授權、服務與 Provider 費用 |

表中「依文件確認」不是負面評價，而是避免把不同版本、不同方案或未驗證功能硬說成一致。尤其**模型費用**與**管理工具價格**不是一回事。

## 5. 使用者討論：應該如何讀 Reddit 與 GitHub Issues？

社群評價可以幫忙找出真實情境，但不能等同於測試。對 T3 Code，值得持續觀察：

- **Provider 認證與狀態探測：** 例如 [GitHub Issue #41195](https://github.com/pingdotgg/t3code/issues/41195) 回報 macOS Claude Provider 明明已登入卻顯示未認證。這是特定環境回報，不能外推到所有人。
- **長期運作的 Session 穩定度：** 關注 Provider 重連、主機重啟、裝置斷線的恢復策略與版本修正。
- **權限與遠端存取：** Full access 的方便性與風險、裝置配對方式，以及主機是否可從外部訪問。
- **真正的工作效率：** 與其只問「介面是否漂亮」，更應觀察實際修改與審核 Diff 的時間成本。

資料來源可從 [T3 Code Issues](https://github.com/pingdotgg/t3code/issues)、[Discussions](https://github.com/pingdotgg/t3code/discussions) 及 [Hacker News Search](https://hn.algolia.com/?query=T3%20Code) 自行追蹤。討論貼文需要比對發表日期、版本、平台和可重現步驟，本文不會用未核實的留言編造統計比例。

## 6. 如果由我來選，會怎麼判斷？

| 你的工作方式 | 優先研究的工具 | 理由 |
| --- | --- | --- |
| Claude、Codex、OpenCode 交替使用 | **T3 Code** | 多 Provider 介面是核心定位 |
| 重度平行工作與桌面多工作區管理 | **Conductor** | 更貼近多工作區操作場景 |
| 只想在通勤時核准本機 Agent 任務 | **Happy 或 T3 Code** | 先比較手機通知、連線、安全與 Provider 相容性 |
| 只用一個 CLI、不常離開電腦 | **原生 Agent** | 少一層系統與維護成本 |

這是**依需求做的選型建議**，不是實測冠軍排名。如果你做企業內部研發平台，還應補上權限政策、Audit Log、資料路徑、帳號策略和服務可用性要求。

## 7. 建議的實測矩陣

如果未來要真的做跨工具評測，建議固定同一個 Git Repo、同一個任務、盡量接近的 Agent 與模型配置，再紀錄：

| 指標 | 如何測量 |
| --- | --- |
| 首次安裝時間 | 從乾淨環境到第一個成功 Thread |
| 任務完成時間 | 相同功能需求到測試通過 |
| Diff 可審核性 | 人工看懂修改、回復與提交是否順暢 |
| 遠端重連 | 切網路、關閉手機再開啟，看 Session 是否保留 |
| Provider 失敗恢復 | 主動終止 Provider 後是否能恢復 |
| 資源消耗 | 同一主機條件下監測 CPU、RSS、磁碟 |
| 安全與權限 | 未批准命令能否被攔截、不同連線可做什麼 |

上述是**未來實測設計**，沒有虛構數字。

## 重點回顧

- **T3 Code** 的核心價值是多 Provider、跨裝置與 Git 工作流程的整合。
- **Conductor** 值得從桌面並行開發效率研究。
- **Happy** 值得從手機遠端接手任務研究。
- 沒有同機、同任務的實測，不能給「最快」、「最穩」的結論。
- 工具選型應先從工作情境、風險邊界及 Provider 相容性開始。

**上一篇：** [T3 Code 架構解析](../t3-code-architecture/)　｜　**返回系列開頭：** [T3 Code 是什麼？](../t3-code-overview/)

**來源：** [T3 Code](https://github.com/pingdotgg/t3code) · [Conductor 官方網站](https://www.conductor.build/) · [Happy GitHub](https://github.com/slopus/happy) · [Happy Desktop](https://github.com/slopus/happy-desktop) · [Conductor Git Worktree 文件](https://www.conductor.build/docs/concepts/git-worktrees) · [T3 Code Issue #41195](https://github.com/pingdotgg/t3code/issues/41195) · [官方權限文件](https://github.com/pingdotgg/t3code/blob/main/docs/user/permission-modes.md)
