function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function shiftDateKey(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey)
  date.setDate(date.getDate() + days)
  return formatDateKey(date)
}

export function formatMonthDayLabel(dateKey: string): string {
  const [, month, day] = dateKey.split('-')
  return `${parseInt(month, 10)}月${parseInt(day, 10)}日`
}
