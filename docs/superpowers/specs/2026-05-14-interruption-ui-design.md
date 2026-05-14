# 打断处理 UI 设计文档

> 日期：2026-05-14
> 状态：已批准，待实现
> 依赖：快速记录流程（已完成）、reschedule 算法（已完成）

---

## 1. 概述

实现 MVP 中的**打断处理**功能（P0）。当用户正在执行任务时，可一键插入新任务，原任务自动暂停；插入任务结束后，底部栏提示恢复，恢复时自动触发 reschedule 后推后续安排。

**设计原则**：复用现有组件、最少点击、不引入模态框。

---

## 2. Store 状态与 Actions 变更

### 2.1 复用现有状态

不新增状态字段。复用 `AppState` 中已预留的 `pausedTaskId`（当前未使用）。

### 2.2 新增 Actions

```typescript
interruptTask: (title: string, plannedDurationMinutes: number, category?: string) => void
resumeTask: () => void
```

### 2.3 `interruptTask` 执行逻辑

1. 断言 `activeTaskId` 存在。
2. 将当前任务状态改为 `paused`，计算并记录 `actualDurationMinutes`（已进行时长 = now - actualStart）。
3. 创建新任务，状态 `active`，启动计时（`timerStartAt = Date.now()`）。
4. 创建 `Interruption` 记录，填入 `interruptedTaskId`、`newTaskId`、`timestamp`、`description`（新任务标题）。
5. `pausedTaskId` 指向原任务，`activeTaskId` 指向新任务。

### 2.4 `resumeTask` 执行逻辑

1. 断言 `pausedTaskId` 存在。
2. 计算打断时长：新任务的 `actualDurationMinutes`（从 start 到 end 的实际耗时）。
3. 调用 `reschedule(tasks, pausedTaskId, interruptionTask)`，其中 `interruptionTask` 为刚结束的打断任务。
4. 将原任务状态改回 `active`，更新 `scheduledStart/End`（来自 reschedule 结果）。
5. `activeTaskId` 指向恢复后的任务，`pausedTaskId` 置空，`timerStartAt` 重置为当前时间。
6. 后续未开始计划任务的时间已被 reschedule 更新。

### 2.5 `endTask` 调整

- 若 `pausedTaskId` 存在且当前结束的是打断任务（`activeTaskId === interruption.newTaskId`）→ 结束后不清空 `pausedTaskId`，让 UI 进入"恢复提示"模式。
- 若 `pausedTaskId` 为 null → 正常结束流程（现有逻辑）。

---

## 3. UI 组件交互

### 3.1 `ActiveTaskBar` 三态

`ActiveTaskBar` 根据 `pausedTaskId` 和 `activeTaskId` 的组合呈现三种状态。

#### 状态 1：正常进行中

```
[▶ 任务标题] [已用 10:23 · 剩余 19:37]    [有事插入] [完成]
```

- 新增"有事插入"按钮：outline 样式，红色文字/边框（`text-interruption-text border-interruption-border`）。
- 点击后 → 进入状态 2。

#### 状态 2：打断输入模式

- 底部栏区域展开，上方保留缩略提示："⏸ 当前被打断：XX（已暂停）"。
- 下方复用 `QuickStart` 输入模式：自定义输入框 + 快捷预设按钮。
- 快捷预设按钮中增加"紧急"视觉标签（更醒目）。
- 用户输入新任务并点击"开始" → 调用 `interruptTask` → 状态 2 结束。
- 提供"取消"按钮返回状态 1。

#### 状态 3：恢复提示模式

（打断任务已结束，`pausedTaskId` 存在，`activeTaskId` 为 null）

```
[⏸ 任务 A 已暂停 45 分钟]    [恢复执行]
```

- 背景色变为 `bg-interruption-bg`（淡红），营造"待处理"氛围。
- "恢复执行"按钮：主按钮样式，绿色。
- 点击后 → 调用 `resumeTask` → reschedule 执行 → 时间线平滑更新 → 回到状态 1。

### 3.2 `QuickStart` 调整

- 当 `activeTaskId` 存在时，`QuickStart` 不渲染（被 `ActiveTaskBar` 覆盖）。
- 打断输入模式通过 `ActiveTaskBar` 内部渲染输入区实现，不独立显示 `QuickStart`。

### 3.3 `TaskBlock` 与 `Timeline` 更新

- `paused` 状态的任务用插入/打断色（`bg-interruption-bg`）渲染。
- `TaskBlock` 增加 `paused` 状态标签：显示"已暂停" + 已进行时长。
- 恢复并重排后，被打断的任务和后续任务位置平滑过渡（`transition-all duration-300 ease-in-out`）。

---

## 4. 与 `reschedule` 集成及边界处理

### 4.1 触发时机

`resumeTask` 调用时，打断任务已结束（已有 `actualDurationMinutes`），以被打断任务 ID 和打断任务为参数调用 `reschedule`。

### 4.2 返回值处理

- `reschedule` 返回 `Task[] | null`。
- 返回 `null`（理论上不会发生，因打断任务必有 actualDuration）→ 兜底提示"无法自动调整"。
- 返回新任务数组 → 直接更新 `schedule.tasks`。

### 4.3 边界情况

| 场景 | 处理 |
|------|------|
| 打断任务无预估时长 | 打断任务开始时必须带 `plannedDurationMinutes`（复用 QuickStart 逻辑，默认 30 分钟）。若用户选了"不确定"，按 15 分钟默认值处理。 |
| 后推跨天 | `reschedule` 只移动时间戳。`resumeTask` 中检查：如有任务 `scheduledEnd` 超过当天 23:59，标记为 `deferred`，清空 `scheduledStart/End`，时间线显示"延后到明天"。 |
| 用户拒绝新排程 | MVP 不实现。恢复即接受。不满意可手动调整时间线（v2）。 |
| 打断期间刷新页面 | LocalStorage 已持久化 `pausedTaskId`、`activeTaskId`、`timerStartAt`。刷新后恢复对应状态。 |

---

## 5. 测试要点

1. **正常打断恢复流**：任务 A 运行 10 分钟 → 打断任务 B 20 分钟 → 恢复 A → A 和后续任务均后推 20 分钟。
2. **跨天检测**：任务 A 运行到 23:00，打断 30 分钟，后续任务排到 23:50 → 恢复后检查跨天标记。
3. **刷新恢复**：打断任务 B 进行中刷新页面 → 应恢复 B 的计时；B 结束后刷新 → 应显示恢复提示。
4. **状态机完整性**：`interruptTask` 时 `activeTaskId` 必须存在；`resumeTask` 时 `pausedTaskId` 必须存在。
