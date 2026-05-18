# 时间感知（Shigan）

> 一个有时间感知能力的个人日程工具。不是静态日历，而是动态时间调度器。

---

## 核心功能

### V1 MVP（已完成）

- **快速记录** —— 打开网页，输入任务名，一键开始计时。随时记录，无需提前规划。
- **计划任务** —— 预先安排任务和预计时长，生成纵向时间线。到时间可一键"开始执行"或"跳过"。
- **时间线视图** —— 一天 24 小时纵向排列，每个任务以色块展示实际占用的时间段。空白时间段以虚线边框高亮，提醒"这段时间没记录"。
- **打断处理** —— 任务进行中点击"有事插入"，原任务暂停，插入新任务。结束后一键恢复，自动重排后续日程。
- **自动重排** —— 打断结束后，后续计划任务自动后推，展示新时间线。若后推跨天，原任务自动标记为"顺延至明日"。
- **结束提醒** —— 计划任务结束前 5 分钟浏览器推送提醒，结束时弹窗提示"结束 / 延长 10 分钟 / 顺延至明日"。
- **今日报告** —— 一天结束后查看统计：计划时长、实际工作时长、打断时长、任务完成率、分类占比。
- **快捷预设** —— 常见临时任务一键开始（深度工作、会议、休息等），减少输入负担。
- **本地持久化** —— 数据保存在浏览器 LocalStorage，刷新不丢失，支持旧数据格式自动迁移。

### V2 功能（已完成）

- **事后补录** —— 在时间线空白处点击，回填已完成任务，补全遗漏记录。
- **浏览器通知** —— 基于 Web Notifications API，60 秒 tag 去重，支持结束提醒和 5 分钟预警。
- **数据导出** —— 支持 JSON / CSV 格式导出当日数据（Blob + ObjectURL 下载）。
- **历史日期查看** —— Store 支持多日期 `schedules: Record<string, DaySchedule>`，Header 提供 prev / today / next 导航。
- **PWA 配置** —— 可安装为桌面/移动应用，离线可用，含 manifest、icons、service worker。
- **空状态设计** —— 首次使用、无计划日、全部空白等场景均有引导提示。
- **键盘快捷键** —— 空格键快速结束当前任务，Escape 取消弹窗。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite 8 + `@tailwindcss/vite` |
| 样式 | Tailwind CSS v4（CSS-first `@theme` 配置） |
| 状态管理 | Zustand 5 + persist 中间件 |
| 字体 | Geist + Geist Mono（`font-variant-numeric: tabular-nums`） |
| 单元测试 | Vitest 4 + Testing Library |
| E2E 测试 | Playwright |
| PWA | `vite-plugin-pwa` |

---

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行单元测试
npm test

# 运行 E2E 测试
npx playwright test

# 构建生产版本
npm run build
```

---

## 项目结构

```
src/
  components/          # React 组件
    Timeline.tsx       # 时间线主视图
    TaskBlock.tsx      # 任务色块
    QuickStart.tsx     # 快速记录面板
    ActiveTaskBar.tsx  # 底部"正在播放"任务栏
    PlanTaskPanel.tsx  # 计划任务添加面板
    BackfillPanel.tsx  # 事后补录面板
    EndReminderModal.tsx   # 结束提醒弹窗
    ExportButton.tsx   # 数据导出按钮
    ReportView.tsx     # 今日报告
    EmptyState.tsx     # 空状态提示
  core/                # 核心算法
    reschedule.ts      # 自动重排算法
    compactSchedule.ts # 跳过任务后的紧凑算法
    report.ts          # 报告生成 + TimeInsight
    date.ts            # 日期工具（4:00 日期边界）
    timer.ts           # 计时器辅助
  store/
    useAppStore.ts     # Zustand 全局状态（多日期 schedules）
  hooks/
    useNow.ts          # 每秒刷新当前时间
    useNotifications.ts    # 浏览器通知管理
  types/
    index.ts           # TypeScript 类型定义
  data/
    mock.ts            # 示例数据（首次使用展示）
  App.tsx              # 根组件
  main.tsx             # 入口
  index.css            # Tailwind CSS 入口 + @theme 配置
```

---

## 设计系统

详见 [`DESIGN.md`](DESIGN.md)。

- **方向：** Industrial/Utilitarian（工业实用主义）
- **字体：** Geist（正文/UI）+ Geist Mono（数据/时间）
- **颜色：** 5 色语义状态系统（计划中蓝、进行中绿、超时黄、打断红、完成灰）+ 图标双重编码（色盲友好）
- **布局：** 移动优先，`< 640px` 单列 / `640–1024px` 居中 480px / `> 1024px` 60/40 双栏
- **动画：** 开始任务滑入（200ms）、结束收缩（150ms）、打断插入（250ms）、重排过渡（300ms）

---

## 关键决策

- **计时方案：** `Date.now()` 差值，不采用 Web Worker / setInterval 累加
- **打断模型：** 扁平化，不支持嵌套栈；任何时候最多一个 active task
- **持久化：** LocalStorage（Zustand persist），自动迁移旧单日期格式到新多日期格式
- **日期边界：** 凌晨 4:00 为界
- **响应式：** 手机单列 / 平板 480px 居中 / 桌面 60/40 双栏

---

## 测试覆盖

- **单元测试：** 66 个（Vitest），覆盖 store actions、核心算法、组件交互
- **E2E 测试：** 10 个（Playwright），覆盖首页、时间线、快捷任务、完成、打断、补录、视图切换、导出

---

## 浏览器支持

- Chrome / Edge / Firefox / Safari 最新版
- 需要支持 Web Notifications API（通知功能）
- PWA 安装需要支持 Service Worker

---

## 许可

私有项目。
