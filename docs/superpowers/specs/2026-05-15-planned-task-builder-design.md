# 计划任务 Builder 设计文档

> 日期：2026-05-15
> 状态：已批准，待实现
> 依赖：打断处理 UI（已完成）、时间线渲染（已完成）

---

## 1. 概述

实现 MVP 中的**计划任务**功能（P0）。用户可预先安排任务和预计时长，在时间线上以蓝色块展示。到计划开始时间时，可选择"开始执行"或"跳过"。跳过则自动前移后续计划任务。

**设计原则**：复用现有交互模式（底部面板 + 快捷选项），与时间线直接关联，不引入拖拽或复杂排程。

---

## 2. Store 状态与 Actions 变更

### 2.1 新增 Actions

```typescript
addPlannedTask: (title: string, plannedDurationMinutes: number) => void
skipTask: (taskId: string) => void
activateTask: (taskId: string) => void
```

### 2.2 `addPlannedTask` 执行逻辑

1. 计算默认 `scheduledStart`：
   - 找到最后一个有 `scheduledEnd` 的 task（任意状态）
   - 如果有，取 `scheduledEnd`
   - 如果没有，取当前时间向上取整到下一个半小时（如 10:07 → 10:30）
2. 创建 Task：
   ```typescript
   {
     id: generateId(),
     title,
     plannedDurationMinutes,
     status: 'scheduled',
     scheduledStart: computedStart,
     scheduledEnd: new Date(computedStart.getTime() + plannedDurationMinutes * 60000),
     priority: 'medium',
     revisionCount: 0,
   }
   ```
3. 追加到 `schedule.tasks`。

### 2.3 `skipTask` 执行逻辑

1. 断言目标 task 状态为 `scheduled`。
2. 调用 `compactSchedule(schedule.tasks, taskId)` 前移后续任务。
3. 更新目标 task：
   - 状态变为 `cancelled`
   - `scheduledStart` / `scheduledEnd` 置 `undefined`
   - `revisionCount + 1`
4. 替换 `schedule.tasks` 为 compactSchedule 返回的列表。

### 2.4 `activateTask` 执行逻辑

1. 断言目标 task 状态为 `scheduled`。
2. 断言当前无 `activeTaskId`（store 中已有此检查，但需确保）。
3. 更新目标 task：
   - 状态变为 `active`
   - `actualStart = new Date()`
   - `scheduledEnd` 保持不变（作为计划结束参考）
4. 设置 `activeTaskId = taskId`，`timerStartAt = Date.now()`。

---

## 3. 核心算法：`compactSchedule`

**职责**：当计划任务被跳过时，前移后续所有 scheduled 任务，填补空缺。

**签名**：
```typescript
export function compactSchedule(
  tasks: Task[],
  skippedTaskId: string,
): Task[] | null
```

**逻辑**：
1. 找到被跳过的 task。如果没有 `scheduledStart` 或 `scheduledEnd`，返回 `null`。
2. 计算空缺时长 `gapMs = scheduledEnd - scheduledStart`。
3. 遍历任务：
   - 被跳过任务本身：状态变 `cancelled`，清空时间，revisionCount + 1。
   - 后续 scheduled 任务（`scheduledStart >= skippedTask.scheduledStart`）：`scheduledStart` 和 `scheduledEnd` 均前移 `gapMs`，revisionCount + 1。
   - 其他任务：不变。

**与 `reschedule` 的关系**：`reschedule` 是"后推"（+delay），`compactSchedule` 是"前移"（-gap），两者对称。

---

## 4. UI 组件

### 4.1 入口：时间线顶部"添加计划"按钮

在时间线 header 区域（或 Timeline 组件内部顶部）添加：
```
[今天的时间线]          [+ 添加计划]
```

- 按钮样式：outline，蓝色（`text-scheduled-text border-scheduled-border`）
- 点击后展开计划任务添加面板

### 4.2 `PlanTaskPanel` 组件

**位置**：底部固定面板（与 QuickStart / ActiveTaskBar 同层级）。

**内容**：
- 输入框：placeholder "计划做什么？"
- 时长快捷选项：15分钟 / 30分钟 / 60分钟 / 90分钟
- 自定义输入（可选，默认 30 分钟）
- "添加" 主按钮 + "取消" 次按钮

**行为**：
- 选择时长或输入后点击"添加" → 调用 `addPlannedTask` → 面板关闭
- 点击"取消"或面板外 → 关闭面板
- 如果当前有 `activeTaskId`，面板不显示（由 ActiveTaskBar 接管）

### 4.3 计划任务的时间线渲染

`TaskBlock` 已支持 `scheduled` 状态：
- 背景：`bg-scheduled-bg`（蓝色）
- 文字：`text-scheduled-text`
- 图标：`○`
- 标签：`计划`

### 4.4 到时间提醒："开始执行 / 跳过"

**触发条件**：当前时间 ≥ task.scheduledStart，且 task.status === 'scheduled'。

**UI 表现**：在 scheduled 任务块内部（或覆盖在任务块上）显示两个按钮：
- "开始执行"：调用 `activateTask`，任务变绿色并开始计时
- "跳过"：调用 `skipTask`，任务变灰色并前移后续任务

**实现方式**：在 `TaskBlock` 组件中，根据 `isScheduledAndDue` 条件渲染操作按钮。

---

## 5. 边界情况

| 场景 | 处理 |
|------|------|
| 添加计划任务时已有 active 任务 | 允许添加，计划任务排在时间线末尾，不冲突 |
| 跳过任务导致跨天前移 | 如某任务前移后 `scheduledStart` 变成昨天，保留实际时间（允许历史时间存在），在报告中标注"被压缩" |
| 开始计划任务时已有 active 任务 | `activateTask` 检查 `activeTaskId`，如果不为 null 则 return（不允许同时两个 active） |
| 计划任务开始时间已过但用户没操作 | 任务保持 `scheduled` 蓝色，按钮一直显示，直到用户选择或跳过 |
| 添加计划任务跨天 | 允许，`scheduledEnd` 自然排到第二天 |

---

## 6. 测试要点

1. `addPlannedTask`：空时间线 / 已有任务追加 / 默认开始时间取整
2. `compactSchedule`：单任务跳过 / 多任务前移 / 跳过最后一个任务（无前移）
3. `skipTask`：状态变更 / revisionCount 增加 / 后续任务时间正确
4. `activateTask`：状态 active / actualStart 设置 / timerStartAt 启动
5. `TaskBlock`：scheduled 状态渲染 / 到时间按钮显示 / 点击开始或跳过
