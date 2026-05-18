# 结束提醒设计文档

> 日期：2026-05-15
> 状态：已批准，待实现
> 依赖：计时器引擎（已完成）、ActiveTaskBar（已完成）

---

## 1. 概述

实现 MVP 中的**结束提醒**功能（P0）。当进行中的任务接近计划结束时间时，通过视觉脉冲提示用户；到达计划结束时间时，弹窗提供结束/延长/延后选项。

**设计原则**：不打扰、渐进提醒、用户始终有控制权。

---

## 2. 提醒时机与表现

### 2.1 T-5 分钟：预提醒脉冲

**触发条件**：`remainingMs <= 5 * 60 * 1000` 且 `remainingMs > 0`

**UI 表现**：
- ActiveTaskBar 底部栏边框出现脉冲动画
- CSS: `animate-pulse-reminder` 自定义动画
- 动画定义：box-shadow 从 `0 0 0 0 rgba(253, 224, 71, 0.4)` 到 `0 0 0 8px rgba(253, 224, 71, 0)`，1.5s ease-in-out infinite
- 边框颜色变为 `border-overtime-border`（黄色）
- 剩余时间文字变为 `text-overtime-text`（黄色）

### 2.2 T-0：到期弹窗

**触发条件**：`remainingMs <= 0` 且任务状态仍为 `active`

**UI 表现**：
- 居中模态弹窗，遮罩 `bg-black/50 backdrop-blur-sm`
- 弹窗内容：
  - 标题：`"时间到了"`
  - 副标题：`任务 "{task.title}" 计划时间已结束`
  - 三个按钮：
    1. **结束** — 主按钮，调用 `endTask()`
    2. **延长 10 分钟** — 次按钮，调用 `extendTask(10)`
    3. **延后** — 次按钮，调用 `deferTask()`

**行为**：
- 弹窗出现后，底部 ActiveTaskBar 继续显示"已超时"状态
- 用户选择前，任务保持 `active` 状态，计时继续

---

## 3. Store Actions 变更

### 3.1 新增 Actions

```typescript
extendTask: (additionalMinutes: number) => void
deferTask: () => void
```

### 3.2 `extendTask` 执行逻辑

1. 断言当前有 `activeTaskId`
2. 找到 active task
3. 更新 task：
   - `scheduledEnd = new Date(scheduledEnd.getTime() + additionalMinutes * 60000)`
   - `revisionCount + 1`
4. 关闭到期弹窗（如果打开）

### 3.3 `deferTask` 执行逻辑

1. 断言当前有 `activeTaskId`
2. 找到 active task
3. 更新 task：
   - `status = 'deferred'`
   - `scheduledStart = undefined`
   - `scheduledEnd = undefined`
   - `revisionCount + 1`
4. 设置 `activeTaskId = null`，`timerStartAt = null`
5. 关闭到期弹窗（如果打开）

---

## 4. UI 组件

### 4.1 `EndReminderModal` 组件

**位置**：`src/components/EndReminderModal.tsx`

**Props：**
```typescript
interface EndReminderModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
}
```

**内容**：
- 遮罩层：fixed inset-0 bg-black/50 backdrop-blur-sm z-30
- 弹窗容器：fixed inset-0 flex items-center justify-center z-40
- 弹窗卡片：bg-bg-base rounded-xl shadow-2xl px-6 py-5 max-w-[320px] w-full mx-4
- 标题：text-lg font-semibold text-text-primary
- 副标题：text-sm text-text-secondary mt-1
- 按钮组：flex flex-col gap-2 mt-4
  - "结束"：bg-active-bg text-active-text border border-active-border
  - "延长 10 分钟"：bg-bg-subtle text-text-primary border border-border-light
  - "延后到明天"：bg-bg-subtle text-text-primary border border-border-light
- 关闭按钮（X）：absolute top-3 right-3 text-text-muted hover:text-text-primary

### 4.2 ActiveTaskBar 脉冲样式

在 `remainingMs <= 5 * 60000 && remainingMs > 0` 时：
- 外层 div 添加 `animate-pulse-reminder border-overtime-border` 类
- 剩余时间文字使用 `text-overtime-text`

在 `src/index.css` 添加自定义动画：
```css
@keyframes pulse-reminder {
  0%, 100% { box-shadow: 0 0 0 0 rgba(253, 224, 71, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(253, 224, 71, 0); }
}
.animate-pulse-reminder {
  animation: pulse-reminder 1.5s ease-in-out infinite;
}
```

---

## 5. App.tsx 集成

在 `App.tsx` 中：
1. 监听 `activeTask` 的 `remainingMs`
2. 当 `remainingMs <= 0` 时，设置 `showEndModal = true`
3. 渲染 `<EndReminderModal task={activeTask} isOpen={showEndModal} onClose={() => setShowEndModal(false)} />`
4. 弹窗关闭条件：用户点击结束/延长/延后，或点击 X 关闭

---

## 6. 边界情况

| 场景 | 处理 |
|------|------|
| 用户点击 X 关闭弹窗 | 弹窗关闭，任务继续 active，计时继续 |
| 延长后再次到期 | 再次触发弹窗 |
| 任务被打断时到期 | 打断时任务状态是 paused，不会触发弹窗 |
| 没有 scheduledEnd | 不触发提醒（自由计时任务） |

---

## 7. 测试要点

1. 脉冲动画：T-5 分钟时边框样式变化
2. 弹窗触发：remainingMs <= 0 时弹窗出现
3. 结束按钮：调用 endTask，关闭弹窗
4. 延长按钮：scheduledEnd 后推，revisionCount + 1
5. 延后按钮：任务状态变 deferred，activeTaskId 清空
6. 弹窗关闭：点击 X，弹窗消失，任务继续
