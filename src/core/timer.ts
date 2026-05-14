/**
 * 计时器引擎。
 * 采用 Date.now() 差值方案，无累加误差，无后台节流问题。
 */

export function calculateRemainingMs(plannedEnd: Date): number {
  return plannedEnd.getTime() - Date.now()
}

export function calculateActualDurationMs(startAt: number): number {
  return Date.now() - startAt
}

export function formatDurationMinutes(ms: number): number {
  return Math.max(0, Math.round(ms / 60000))
}

export function formatDurationShort(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) {
    return `${hours}时${minutes}分`
  }
  return `${minutes}分`
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
