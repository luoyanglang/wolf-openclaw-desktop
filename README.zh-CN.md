<div align="center">
  <img src="https://raw.githubusercontent.com/openclaw/openclaw/main/ui/public/apple-touch-icon.png" width="96" alt="OpenClaw" />
  <h1>WolfClaw Desktop</h1>
  <p><strong>将你的 OpenClaw Gateway 变成完整桌面控制中心的桌面客户端。</strong></p>

  [English](README.md) | 简体中文
</div>

---

[![Version](https://img.shields.io/badge/Version-6.0.1-blue)](https://github.com/luoyanglang/wolf-openclaw-desktop/releases/tag/v6.0.1)
[![Electron](https://img.shields.io/badge/Electron-35-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-2026.3.12+-blueviolet)](https://github.com/openclaw/openclaw)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 🤔 为什么选择 WolfClaw Desktop？

OpenClaw 很强，但如果只通过终端或基础 Web 聊天界面来管理，很多能力并没有真正发挥出来。WolfClaw Desktop 给它提供了一个更完整的桌面入口：

- 💬 **聊天** — 流式回复、工件、图片、语音、聊天内搜索和多标签会话
- 🎤 **语音聊天** — 基于 Gemini Live 的实时语音对话，并由 Gateway 负责智能处理
- 🔘 **智能快捷回复** — 当 AI 需要你的决策时，直接点击按钮完成反馈
- 📅 **日历** — 完整日历视图，支持通过 Cron 向 Telegram、Discord 或 WhatsApp 发送提醒
- 📊 **分析** — 精确查看费用消耗以及按模型、智能体拆分的使用情况
- 🤖 **智能体中心** — 在一个面板中管理所有智能体
- ⏰ **定时任务监控** — 可视化安排并控制任务
- ⚙️ **配置管理** — 用 Smart Merge 编辑 OpenClaw 配置，保留外部改动
- 🧩 **插件** — 9 个内置插件组成的模块化系统，支持页内渲染和状态持久化
- 🔧 **技能与终端** — 不离开应用即可浏览技能市场并运行命令
- 🧠 **记忆浏览器** — 对智能体记忆进行语义搜索和增删改查
- 📋 **会话管理器** — 查看并管理所有活动会话
- 📜 **日志查看器** — 实时查看 Gateway 日志并进行过滤
- 📁 **文件管理器** — 浏览并管理工作区文件
- 🌍 **多语言** — 开箱即用支持阿拉伯语（RTL）、英语、西班牙语和中文

如果你在运行 OpenClaw，WolfClaw Desktop 就是更适合它的桌面界面。

---

## 📸 截图

### 💬 聊天
![Chat](screenshots/chat.gif)

### 🔘 智能快捷回复按钮
![Quick Replies](screenshots/quick-replies.gif)

### 🔧 技能市场
![Skills](screenshots/Skills.gif)

### 💻 集成终端
![Terminal](screenshots/Terminal.gif)

### 🎤 语音聊天
![Voice Chat](screenshots/voice%20chat.gif)

### 🧩 插件
![Plugins](screenshots/Plugins.gif)

### 🌑 深色模式
![Dark Mode](screenshots/pages-dark.gif)

### 🌕 浅色模式
![Light Mode](screenshots/pages-light.gif)

---

## ✨ 功能

### 💬 聊天与通信
- 流式 Markdown，支持语法高亮和主题感知的代码块
- 使用 `Ctrl+Tab` 切换多标签会话
- 智能快捷回复按钮 —— AI 可直接给出 `[[button:Label]]` 可点击选项
- 聊天内搜索（`Ctrl+F`），支持结果跳转
- 支持粘贴/拖拽/上传图片，支持文件附件、视频播放和语音消息
- 表情选择器，支持搜索和分类
- 工件预览 —— 在沙箱窗口中交互式预览 HTML、React、SVG 和 Mermaid
- 使用 Virtuoso 虚拟列表，长会话滚动更流畅
- 断线后自动恢复发送队列

### 📅 日历
- **三种历法系统** —— 公历、回历（Islamic Umm al-Qura）和农历
- 支持月、周、日视图，以及按小时排列的时间轴
- 可添加、编辑、删除事件，并支持不同颜色分类（工作、个人、健康、社交、其他）
- 支持每日、每周、每月、每年重复事件
- 基于 Cron 的提醒 —— 每个事件都会创建一个 OpenClaw Cron 任务自动发送提醒（适用于全部历法系统）
- 自定义提醒时间 —— 支持事件前 5、15、30、60 分钟，2 小时，1 天或 1 周
- 可选择提醒投递渠道 —— Telegram、Discord、WhatsApp 或最近一次活跃渠道
- 一次性提醒触发后自动删除
- 离线优先 —— 事件先保存在 localStorage，连接 Gateway 后再同步
- 完整多语言支持（阿拉伯语、英语、西班牙语、中文）

### 🎤 语音聊天
- 基于 **Gemini Live API** 的实时语音对话
- **Gateway 语音桥接** —— Gemini 负责语音转文本和文本转语音，Gateway 负责智能处理
- **AudioWorklet** 麦克风采集（PCM16 @ 16kHz），配合无缝音频播放（PCM @ 24kHz）
- **Silero VAD**（语音活动检测）—— 过滤背景噪音，只发送真实语音
- **Aura 可视化器** —— 带有四种状态动画的语音光球：空闲、监听、思考、说话
- 独立设置面板 —— Gemini API Key、响应模型、语音选择、Live 模型
- 独立语音会话 —— 与文本聊天历史分离
- 显示会话计时器和模型信息

### 🧩 插件
- 模块化插件系统，内置 **9 个插件**：像素工作室、会话管理器、日志查看器、多智能体、文件管理器、代码解释器、MCP 工具、技能、记忆浏览器
- **响应式网格布局** —— 桌面端 3 列、平板 2 列、移动端 1 列
- **页内渲染** —— 插件直接在当前页面内打开，不跳转路由
- **状态持久化** —— 记住上次打开的插件
- 玻璃卡片设计，带悬浮动画和发光效果

### 📊 监控与分析
- **Dashboard** —— 一眼查看费用、Token、会话和活动智能体
- **完整分析** —— 日期范围、模型/智能体/Token 拆分、日明细表、CSV 导出
- **智能体中心** —— 创建、编辑、删除智能体，并监控子智能体和工作节点
- **定时任务监控** —— 支持任务编排、立即运行、暂停，以及查看任务日志和模板

### ⚙️ 配置
- **配置管理器** —— 可视化编辑 OpenClaw 配置（Providers、Agents、Channels、Advanced）
- **Smart Merge** —— 保存时重新读取磁盘配置，只合并你的改动，保留 CLI 或外部修改
- **Secrets Manager** —— 密钥审计、Provider 视图和运行时重载

### 🔧 工具
- **技能市场** —— 浏览并搜索 ClawHub 中 3,286+ 个技能
- **集成终端** —— 基于 xterm.js 和 node-pty 的 PowerShell/Bash 终端，多标签支持
- **Workshop** —— 可被 AI 通过文本命令管理的看板面板
- **记忆浏览器** —— 对智能体记忆进行语义搜索和增删改查

### 🎨 界面
- 深色与浅色主题，使用完整的共享主题变量系统
- 6 种强调色（青绿、蓝、紫、玫瑰、琥珀、翡翠）
- 4 种语言：阿拉伯语（RTL）、英语（LTR）、西班牙语、中文，使用逻辑 CSS 属性适配布局
- 命令面板（`Ctrl+K`）、键盘快捷键、全局热键（`Alt+Space`）
- 标题栏内置模型和思考等级选择器
- 使用代码分割的惰性加载页面，加快启动速度
- 玻璃拟态设计，结合 Framer Motion 动画
- 基于 Ed25519 设备身份与挑战-响应认证

---

## 📦 安装

从 [Releases](../../releases) 下载：

| 文件 | 类型 |
|------|------|
| `WolfClaw-Desktop-Setup-X.X.X.exe` | Windows 安装版 |
| `WolfClaw-Desktop-X.X.X.exe` | 便携版（免安装） |

### 要求

- Windows 10/11
- 本地或远程运行中的 [OpenClaw](https://github.com/openclaw/openclaw) Gateway

首次启动时，你需要与 Gateway 完成一次配对，底层使用 Ed25519 设备认证。

---

## 🔌 工作原理

WolfClaw Desktop 是前端客户端 —— 它本身不运行 AI，也不保存核心数据。所有核心状态都存放在你的 OpenClaw Gateway 中。

```
OpenClaw Gateway（本地或远程）        Gemini Live API
        │                                      │
        │  WebSocket                           │  WebSocket
        ▼                                      ▼
  WolfClaw Desktop ───────────────────────────────
  ├── Chat        ← 消息与流式回复
  ├── Voice Chat  ← 通过 Gemini 中继的实时语音
  ├── Dashboard   ← 会话、费用、智能体状态
  ├── Calendar    ← 事件与 Cron 提醒
  ├── Analytics   ← 费用汇总与 Token 历史
  ├── Agent Hub   ← 已注册智能体与工作节点
  ├── Cron        ← 定时任务
  ├── Plugins     ← 模块化扩展系统
  ├── Config      ← 可视化配置编辑器
  ├── Skills      ← ClawHub 技能市场
  ├── Terminal    ← 基于 node-pty 的终端
  ├── Sessions    ← 活动会话管理器
  ├── Logs        ← 实时日志查看器
  ├── Memory      ← 语义记忆浏览器
  ├── Files       ← 工作区文件管理器
  ├── Sandbox     ← 代码解释器
  ├── MCP Tools   ← 工具管理
  └── Settings    ← 应用设置
```

---

## 🛠️ 开发

```bash
npm install
npm run dev              # Electron + Vite（热重载）
npm run dev:web          # 仅浏览器模式（不启动 Electron）
npm run build            # 生产构建
npm run package          # NSIS 安装版
npm run package:portable # 便携版 exe
```

---

## 🔧 技术栈

| 层 | 技术 |
|-------|-----------|
| Framework | Electron 35 |
| UI | React 18 + TypeScript 5.7 |
| Build | Vite 6 |
| Styling | Tailwind CSS + CSS Variables |
| Animations | Framer Motion |
| State | Zustand 5 |
| Charts | Recharts |
| Terminal | xterm.js + node-pty |
| Icons | Lucide React |
| Routing | React Router 7 |
| i18n | react-i18next |
| Emoji | emoji-mart |

---

<details>
<summary><strong>⌨️ 键盘快捷键</strong></summary>

| 快捷键 | 功能 |
|----------|--------|
| `Ctrl+K` | 命令面板 |
| `Ctrl+1` – `Ctrl+8` | 页面导航 |
| `Ctrl+,` | 设置 |
| `Ctrl+Tab` | 切换聊天标签 |
| `Ctrl+W` | 关闭标签 |
| `Ctrl+N` | 新建聊天 |
| `Ctrl+F` | 聊天内搜索 |
| `Ctrl+R` | 刷新 |
| `Alt+Space` | 显示/隐藏窗口（全局） |

</details>

---

## 📚 文档

- [Changelog](CHANGELOG.md) — 版本历史和更新说明
- [Contributing](CONTRIBUTING.md) — 贡献方式
- [Security](SECURITY.md) — 漏洞报告
- [Code of Conduct](CODE_OF_CONDUCT.md) — 社区行为准则

---

## 📄 License

[MIT](LICENSE)

## 🙏致谢

[openclaw-desktop](https://github.com/rshodoskar-star/openclaw-desktop)
