# 今日报告设计文档

> 日期：2026-05-15
> 状态：已批准，待实现
> 依赖：打断处理 UI（已完成）、计划任务 builder（已完成）

---

## 1. 概述

实现 MVP 中的**今日报告**功能（P1）。用户可随时查看当天的统计摘要：计划 vs 实际 vs 打断 vs 空白，以及任务完成率和分类占比。

**设计原则**：纯 CSS 图表、无外部图表库、数据从现有 DaySchedule 计算得出。

---

## 2. 数据层：`generateTimeInsight`

**文件**：`src/core/report.ts`

**签名**：
```typescript
export function generateTimeInsight(schedule: DaySchedule): TimeInsight
```

**计算逻辑**：

| 字段 | 计算方式 |
|------|----------|
| `totalPlannedMinutes` | 所有 `status !== 'cancelled'` 任务的 `plannedDurationMinutes` 之和 |
| `totalActualMinutes` | `status === 'completed'` 或 `'active'` 任务的 `actualDurationMinutes` 之和 |
| `totalInterruptionMinutes` | `interruptions` 中，对应的打断任务（通过 `newTaskId` 查找）为 `completed` 状态的 `actualDurationMinutes` 之和 |
| `completedTasks` | `status === 'completed'` 的任务数 |
| `cancelledTasks` | `status === 'cancelled'` 的任务数 |
| `deferredTasks` | `status === 'deferred'` 的任务数 |
| `categoryBreakdown` | 按 `category` 汇总 `actualDurationMinutes`，无 category 的归入 "未分类" |
| `revisionCount` | 所有任务的 `revisionCount` 之和 |

**空白时长**：不存入 `TimeInsight`（非其字段），由 UI 层通过 `findBlankSlots` 实时计算。

---

## 3. UI 层：`ReportView` 组件

**文件**：`src/components/ReportView.tsx`

### 3.1 布局（移动优先，单列）

```
[日期标题]
[核心指标 2x2 网格]
[完成率进度条]
[分类占比条形图]
[洞察文字]
[打断来源列表]
```

### 3.2 核心指标卡片（2x2 网格）

每个卡片：
- 背景：`bg-bg-subtle`
- 边框：`border-border-light rounded-lg`
- 上方小字标签（`text-xs text-text-muted`）
- 下方大字数值（`text-xl font-mono font-tabular text-text-primary`）

四张卡片：
1. **计划时长** — `totalPlannedMinutes`
2. **实际时长** — `totalActualMinutes`
3. **打断时长** — `totalInterruptionMinutes`
4. **空白时长** — 通过 `findBlankSlots(tasks)` 计算的空白段总时长

### 3.3 完成率进度条

- 容器：`h-4 rounded-full bg-bg-muted overflow-hidden`
- 已完成部分（绿色）：`h-full bg-active-bg`（宽度 = completedTasks / totalTasks * 100%）
- 跳过部分（灰色）：`h-full bg-completed-bg`（宽度 = cancelledTasks / totalTasks * 100%）
- 剩余部分（蓝色）：`h-full bg-scheduled-bg`（宽度 = 其他 / totalTasks * 100%）
- 下方文字："X 项完成 · Y 项跳过 · Z 项进行中"

### 3.4 分类占比条形图

纯 CSS 水平条形图：
- 每个 category 一行
- 左侧标签（`text-xs text-text-secondary`）
- 右侧条形：容器 `h-2 rounded-full bg-bg-muted`，填充部分按比例着色（复用 status 色系）
- 最右侧显示分钟数（`text-xs text-text-muted font-mono`）

### 3.5 洞察文字

根据数据生成一句总结：
- `completedTasks > 0` → "X 项任务按时完成"
- `cancelledTasks > 0` → "Y 项被跳过"
- `deferredTasks > 0` → "Z 项延后到明天"
- `revisionCount > 0` → "计划被调整了 W 次"
- 用 `·` 分隔

### 3.6 打断来源列表

- 标题："主要打断来源"
- 按 `interruptions.description` 聚合：
  - 统计每个 description 的出现次数
  - 统计总时长（通过 `newTaskId` 查找对应任务的 `actualDurationMinutes`）
- 每项显示："{description} {count}次 {duration}分钟"

### 3.7 空状态

当 `schedule.tasks.length === 0` 时：
- 显示大图标 `○`（`text-4xl text-text-muted`）
- 文字："今天还没有记录"
- 副文字："点击时间线开始你的第一个任务"

---

## 4. 视图切换

**文件**：`src/App.tsx`

顶部"报告"按钮点击后切换 `view`：
```typescript
const toggleView = () => {
  setView(view === 'timeline' ? 'report' : 'timeline')
}
```

`App.tsx` 主内容区条件渲染：
```tsx
{view === 'timeline' ? (
  <Timeline schedule={displaySchedule} onAddPlan={...} />
) : (
  <ReportView schedule={displaySchedule} />
)}
```

底部栏（ActiveTaskBar / QuickStart）在 report 视图下保持原有逻辑不变。

---

## 5. 边界情况

| 场景 | 处理 |
|------|------|
| 无任务 | 显示空状态 |
| 有任务但无实际时长 | 实际时长显示 0，完成率 0% |
| 无打断 | 打断来源列表隐藏 |
| 无分类 | categoryBreakdown 显示 "未分类" |
| 空白时长为 0 | 空白卡片显示 0 |

---

## 6. 测试要点

1. `generateTimeInsight`：空 schedule / 纯 scheduled 任务 / 混合状态 / 有打断
2. `findBlankSlots` 空白时长计算（已测试）
3. `ReportView` 渲染：空状态 / 有数据状态
4. 视图切换：timeline ↔ report
