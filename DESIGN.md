# Design System — 时间感知

## Product Context

- **What this is:** 一个有时间感知能力的个人日程工具，帮助用户看见一天的时间去向，并在现实打断计划时自动调整后续安排。不是静态日历，而是动态时间调度器。
- **Who it's for:** 自主管理时间的知识工作者——开发者、设计师、写作者、自由职业者、产品经理。
- **Space/industry:** 生产力 / 时间管理工具， peers 包括 Toggl Track、Sunsama、Rize。
- **Project type:** Web PWA（移动优先），单页应用。

## Aesthetic Direction

- **Direction:** Industrial/Utilitarian（工业实用主义）
- **Decoration level:** minimal
- **Mood:** 精密、可信、不打扰。UI 退后，时间数据是主角。像看一个设计精良的仪表盘，而不是一本日历。
- **Memorable thing:** 打开应用，用户看到的不是待办列表，而是**一天的河流**——时间像流水一样清晰可见。

## Typography

- **Body / UI / Labels:** Geist —— 现代几何无衬线，与 Geist Mono 完美配对，Web 加载友好，字形清晰锐利，适合高密度信息界面。
- **Data / Time / Numbers:** Geist Mono —— 等宽数字营造"精密仪器"感，`font-variant-numeric: tabular-nums` 确保时间对齐。这是产品的面孔之一。
- **Code:** Geist Mono
- **Loading:** `npm install @fontsource-variable/geist @fontsource-variable/geist-mono`，在 CSS 中 `@import` 或 `<link>` 加载 Variable 字体文件（Woff2）。Variable 字体减少 HTTP 请求，支持 100–900 全字重。
- **Fallback stack:** `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`（Body）；`'JetBrains Mono', 'Fira Code', monospace`（Mono）

### Type Scale

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| hero | 32px / 2rem | 600 | 顶部大时间显示 |
| heading | 24px / 1.5rem | 600 | 页面标题 |
| title | 20px / 1.25rem | 600 | 任务标题 |
| label | 16px / 1rem | 500 | 任务状态标签 |
| body | 14px / 0.875rem | 400 | 正文、描述 |
| caption | 12px / 0.75rem | 400 | 辅助文字、时间戳 |

## Color

- **Approach:** balanced —— 5 色语义状态系统覆盖主要信息层级，中性灰阶处理结构和文本，不额外使用装饰色。

### Status Colors（背景 / 文字 / 边框）

| 状态 | 背景 | 文字 | 边框 | 图标 |
|------|------|------|------|------|
| 计划中 | `#E0F2FE` | `#0369A1` | `#7DD3FC` | `○` |
| 进行中 | `#DCFCE7` | `#15803D` | `#86EFAC` | `▶` |
| 超时 | `#FEF9C3` | `#A16207` | `#FDE047` | `!` |
| 插入/打断 | `#FEE2E2` | `#B91C1C` | `#FCA5A5` | `⏸` |
| 完成 | `#F3F4F6` | `#6B7280` | `#E5E7EB` | `✓` |
| 空白/未记录 | `#FFFFFF` | `#9CA3AF` | `#E5E7EB` 虚线 | — |

### Neutral Scale

| Token | Hex | Usage |
|-------|-----|-------|
| bg-base | `#FFFFFF` | 页面背景 |
| bg-subtle | `#F9FAFB` | 次级背景、卡片底色 |
| bg-muted | `#F3F4F6` | 悬停、禁用状态 |
| border-light | `#E5E7EB` | 分割线、边框 |
| border-medium | `#D1D5DB` | 聚焦边框 |
| text-placeholder | `#9CA3AF` | 占位符、Caption |
| text-muted | `#6B7280` | 辅助文字 |
| text-secondary | `#374151` | 次要标题 |
| text-primary | `#111827` | 正文、主标题 |

### Dark Mode

Dark mode 不是简单反色。策略：
- 背景从 `#FFFFFF` 变为 `#0B0F19`（深蓝黑，比纯黑更有层次）
- Surface 从 `#F9FAFB` 变为 `#111827`
- 状态色饱和度降低 10–20%，保持可辨识度但不刺眼
- 文字反转为灰阶白 `#F9FAFB` → `#E5E7EB` → `#9CA3AF`
- 语义状态色保持不变（用户靠颜色识别状态，不能变）

## Spacing

- **Base unit:** 4px
- **Density:** comfortable —— 信息密度中等，移动一手可用，不拥挤也不松散。

### Scale

| Token | Value | Common usage |
|-------|-------|--------------|
| space-1 | 2px | 图标与文字间距 |
| space-2 | 4px | 紧凑内边距、行内间距 |
| space-3 | 8px | 任务块间距、按钮组 |
| space-4 | 12px | 任务块内边距、卡片 padding |
| space-5 | 16px | 区块间距、弹窗 padding |
| space-6 | 24px | 组件之间大间距 |
| space-7 | 32px | Section 间距 |
| space-8 | 48px | 页面级间距 |

## Layout

- **Approach:** grid-disciplined —— 严格时间轴网格，左侧小时刻度，右侧色块流。
- **Max content width:** 480px（手机），960px（桌面分栏时总宽）
- **Border radius hierarchy:**
  - sm: 4px —— 小标签、进度条
  - md: 8px —— 任务色块
  - lg: 12px —— 按钮、输入框
  - xl: 16px —— 弹窗、底部固定栏
  - full: 9999px —— 快捷标签、头像

### Breakpoints

| Breakpoint | Layout |
|------------|--------|
| < 640px | 单列，底部固定操作栏，时间线全宽 |
| 640–1024px | 时间线居中，最大宽度 480px，两侧留白 |
| > 1024px | 左侧 60% 时间线，右侧 40% 迷你报告面板 |

## Motion

- **Approach:** intentional —— 只服务于理解，不服务于炫技。动画传达"时间流动"和"状态变化"。
- **Easing:** enter(ease-out), exit(ease-in), move(ease-in-out)

### Animation Tokens

| 交互 | 动画 | 时长 | 缓动 | 目的 |
|------|------|------|------|------|
| 开始任务 | 色块从底部滑入 | 200ms | ease-out | 新任务"到来"的感知 |
| 结束任务 | 色块高度收缩至 0 | 150ms | ease-in | 任务"消失"的确定性 |
| 插入打断 | 原色块左滑，新色块从右滑入 | 250ms | ease-out | 打断的"插入"隐喻 |
| 重排 | 色块位置平滑过渡 | 300ms | ease-in-out | 时间线变化的温和感 |
| 预提醒脉冲 | 边缘 box-shadow 脉冲 | 1.5s | ease-in-out infinite | 不弹窗的温柔提示 |

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-13 | 初始设计系统创建 | 由 /design-consultation 基于 plan-design-review 锁定决策整合生成 |
| 2026-05-13 | Geist + Geist Mono 字体栈 | 现代、清晰、配对完美，等宽数字强化"精密仪表盘"感知 |
| 2026-05-13 | 5 色语义状态 + 图标双重编码 | plan-design-review 锁定，色盲友好，对比度 ≥ 4.5:1 |
| 2026-05-13 | 4px 基准网格 | plan-design-review 锁定，Tailwind 原生兼容 |
| 2026-05-13 | 虚线高亮空白时间段 | 风险决策：不隐藏黑洞，产品核心价值所在 |
| 2026-05-13 | 底部固定"正在播放"任务栏 | 风险决策：借鉴音乐播放器模式，创造持续感知 |
| 2026-05-13 | 200ms 滑入 / 150ms 收缩 / 300ms 重排 | plan-design-review 锁定，轻快不拖沓 |
| 2026-05-15 | 空状态采用引导式文案 + 图标 | 降低首次使用门槛，不展示空白时间线的焦虑感 |
| 2026-05-15 | 历史日期导航采用 prev/today/next 紧凑布局 | 移动端空间珍贵，不采用日历选择器 |
| 2026-05-15 | 键盘快捷键仅 Space（结束）和 Escape（取消） | 极简原则，避免快捷键冲突和认知负担 |
| 2026-05-15 | PWA theme-color 使用 `#111827` | 与 text-primary 一致，状态栏融入深色标题区域 |
