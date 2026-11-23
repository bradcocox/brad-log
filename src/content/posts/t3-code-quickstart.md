---
title: "T3 Code 從零開始：安裝、連接 Codex／Claude 與手機遠端控制"
author: Brad
pubDatetime: 2026-11-23T09:00:00+08:00
featured: false
draft: false
category: developer-tools
contentType: tutorial
level: beginner
status: learning
tags:
  - t3-code
  - coding-agent
  - agent-orchestration
description: "依照官方文件操作 T3 Code 的安裝、Provider 登入、Supervised 權限與遠端配對，並用驗收表避開常見問題。"
---

> **系列 02／04｜截至 2026-11-23｜學習整理，非端對端實測。** 請先閱讀 [系列 01：T3 Code 是什麼？](../t3-code-overview/)；本文的畫面來自官方，不是作者的執行結果。每個步驟提供操作、預期結果及排錯方向。

## 系列導覽

[01 核心介紹](../t3-code-overview/) · **02 安裝與遠端（本篇）** · [03 架構](../t3-code-architecture/) · [04 競品比較](../t3-code-comparison/)

## 1. 第一次使用前：先確認你要控制哪一台電腦

T3 Code 會在**擁有專案檔案的主機**上執行 Coding Agent。手機和瀏覽器只是在另一個地方操作同一個環境。主機必須保持運作且可以連線；在手機安裝 App 並不會在手機上執行 Claude Code。

你需要一個練習用的 Git Repo、可使用的本機主機，以及至少一種 Agent 登入方式。建議從自己的**非敏感測試程式**開始，不要第一次就開啟公司 Repository。

![T3 Code 官方桌面與手機操作畫面](https://raw.githubusercontent.com/pingdotgg/t3code/main/.github/readme/hero.webp)

*圖 1：官方 README 的真實產品截圖（[原始檔](https://github.com/pingdotgg/t3code/blob/main/.github/readme/hero.webp)）。桌面顯示 Thread，手機端顯示操作核准；並非本文作者的實測。*

## 2. 安裝 T3 Code

最簡單的路線是到 [官方下載頁](https://t3.codes/download) 安裝 macOS、Windows 或 Linux 桌面版。喜歡終端機的讀者也能使用下列官方方式。

| 平台 | 方式 | 成功檢查 |
| --- | --- | --- |
| macOS | `brew install --cask t3-code` | 可開啟 T3 Code App |
| Windows | `winget install T3Tools.T3Code` | 開始功能表可啟動 App |
| Ubuntu / Debian | [GitHub Releases](https://github.com/pingdotgg/t3code/releases) 下載對應 `.deb` | 能正常啟動 App |
| CLI | 從官方安裝腳本或 `npx t3@latest` 試用 | `t3 --help` 顯示指令 |

若使用 Unix 安裝腳本，先下載並審查腳本，再執行，避免不理解內容就直接把網路腳本交給 Shell。官方 CLI 指令：

```bash
curl -fsSL https://t3.codes/install.sh | sh
t3 --help
t3
```

上面為**官方文件提供的安裝流程**，不是本文已執行的紀錄。若提示 `t3: command not found`，查看安裝器對 `~/.local/bin` 的 PATH 指引，重新開啟終端機後再試。Windows 官方 PowerShell 路線為 `irm https://t3.codes/install.ps1 | iex`，也應先檢視腳本來源。

CLI 的 `t3` 會啟動 Server 並開啟 Web App；`t3 serve` 只啟動 Server。詳見 [安裝指南](https://github.com/pingdotgg/t3code/blob/main/docs/user/install.md)。

## 3. 加入第一個 Coding Agent

前往 **Settings → Providers**，確認執行環境，再加入你已安裝、已登入的 Provider。

### 路線 A：Codex

依照官方 [Codex Provider 文件](https://github.com/pingdotgg/t3code/blob/main/docs/user/providers-codex.md)，可以透過引導流程連結相容的 ChatGPT 帳號，或在執行端先使用既有 CLI：

```bash
codex login
```

在 **Settings → Providers** 加入 Codex Instance，依畫面選擇手動設定。**驗收：** Provider 狀態可用、Thread 的模型選單能看到對應 Instance。若遇到 Status Probe 逾時，先查看官方文件的 `T3CODE_CODEX_PROBE_TIMEOUT_MS` 排錯說明，不要先重設全部登入資訊。

### 路線 B：Claude Code

在主機安裝 Claude Code 並登入：

```bash
claude auth login
```

再回 T3 Code 選 Claude Provider。**驗收：** Provider 顯示已認證，可選模型；若顯示未登入，先比對真正的 Claude config directory，使用 [Claude Provider 文件](https://github.com/pingdotgg/t3code/blob/main/docs/user/providers-claude.md) 的配置方式。

### 路線 C：已經有 OpenCode？

T3 Code 支援 OpenCode 1.x 和 2.x，但有最低版本要求。官方 [OpenCode Provider 文件](https://github.com/pingdotgg/t3code/blob/main/docs/user/providers-opencode.md) 記載：1.x 至少 1.14.19，2.x 至少 2.0.18。OpenCode 2 可安裝 `@opencode/cli`。已有使用者資料時，升級前請閱讀資料轉換與版本並存限制。

你也可以先閱讀本站 [OpenCode 入門教學](../opencode-beginner-guide/)。

## 4. 第一個 Thread：權限先選 Supervised

T3 Code 的官方 [Permission Modes](https://github.com/pingdotgg/t3code/blob/main/docs/user/permission-modes.md) 說明新 Thread 初始預設是 **Full access**，它不會在每次編輯或執行指令前詢問。第一次練習時，先在 Composer 的 Permission 選項改成 **Supervised**。

| 模式 | 概念 | 初學者建議 |
| --- | --- | --- |
| Supervised | 命令和修改可能需要批准 | **首選** |
| Auto-accept edits | 自動批准編輯，其餘動作仍可能詢問 | 熟悉流程後再試 |
| Auto | 由 Provider 自動審查部分操作 | 不同 Provider 的行為不同 |
| Full access | 不要求常規命令與編輯核准 | 不建議用於第一次操作 |

先建立一個空白的練習目錄或 Repo，然後給 Agent 這段任務：

> 請先檢查目前的工作目錄與 Git 狀態，說明你打算新增哪些檔案。暫時不要修改檔案、執行安裝或連外操作，等待我確認。

看清楚它的計畫和路徑，再讓它實際操作。**驗收：** Agent 知道正確目錄、你能檢查審批請求、Diff 只出現預期變更。文字指示不是安全邊界，不能取代權限模式與本機環境隔離。

## 5. 手機遠端接手：先選 T3 Connect 或 LAN

官方支援 [iOS](https://apps.apple.com/us/app/t3-code-remote-claude-more/id6787819824) 和 [Android](https://play.google.com/store/apps/details?id=com.t3tools.t3code)。

### 選項 A：T3 Connect

在主機桌面 App 的 **Settings → Sharing & access** 開啟 T3 Connect；CLI 則執行：

```bash
t3 up
t3 status
```

依提示選 **T3 Connect** 完成登入；手機以同一帳號登入並選環境。可再啟用 **Require approval for new devices**，避免新裝置單靠帳號登入就取得存取權。**驗收：** 手機看到正確主機、可讀取 Thread、遠端回覆核准要求。

### 選項 B：區域網路（LAN）

```bash
t3 up --lan
t3 pair
```

依照畫面產生的一次性配對 URL 或 QR Code 讓手機加入。同一個 LAN 可用，但要確保手機能真正到達主機地址；`127.0.0.1` 只代表開啟網址的那台裝置。

### 選項 C：Tailscale

你也可以使用同一 Tailnet，以及官方描述的 Tailscale HTTPS 功能。比起直接公開主機服務，這條路線較適合想自行管理網路存取的讀者；但仍需要確認配對、憑證與主機權限。

閱讀 [Remote Access 官方文件](https://github.com/pingdotgg/t3code/blob/main/docs/user/remote-access.md) 查看最新步驟。**注意：** T3 Connect 的免費主機連結數與未來價格政策可能調整，請以官方帳號與文件為準。

## 6. 常見問題與排錯

| 現象 | 先檢查 |
| --- | --- |
| 手機找不到主機 | 主機是否仍在執行？T3 Connect 是否登入同帳號？ |
| 登入正常但 Agent 不可用 | Provider CLI 是否在**主機**安裝並已登入？ |
| 配對 URL 打不開 | Host 位址、LAN / VPN 可達性、HTTPS 與防火牆 |
| App 結束後連線消失 | 桌面 App 關閉最後視窗可能停止本機 Server；需要時用背景服務 |
| Agent 未詢問就修改檔案 | 檢查 Thread 的 Permissions，是否仍為 Full access |
| 登入／Session 中斷 | 記下版本與錯誤，查 [GitHub Issues](https://github.com/pingdotgg/t3code/issues) |

## 重點回顧

- Provider 在主機執行，手機是遠端控制端。
- 第一次選 **Supervised**，從非敏感練習 Repo 開始。
- 成功安裝不等於 Provider 已登入；兩者要分開驗證。
- T3 Connect、LAN、Tailscale 各有不同的連線與管理成本。
- 本篇是**官方操作步驟整理**；未取得主機實測輸出，不應寫成作者已測試成功。

**上一篇：** [T3 Code 是什麼？](../t3-code-overview/)　｜　**下一篇：** [T3 Code 架構解析](../t3-code-architecture/)

**主要參考：** [Installation](https://github.com/pingdotgg/t3code/blob/main/docs/user/install.md) · [Codex](https://github.com/pingdotgg/t3code/blob/main/docs/user/providers-codex.md) · [Claude](https://github.com/pingdotgg/t3code/blob/main/docs/user/providers-claude.md) · [Remote Access](https://github.com/pingdotgg/t3code/blob/main/docs/user/remote-access.md) · [Permission Modes](https://github.com/pingdotgg/t3code/blob/main/docs/user/permission-modes.md)
