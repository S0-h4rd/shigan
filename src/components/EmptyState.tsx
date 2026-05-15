interface EmptyStateProps {
  variant: 'first-use' | 'no-plans' | 'all-blank'
}

const config = {
  'first-use': {
    icon: '○',
    title: '你的今天是什么样的？',
    subtitle: '点击下方的「开始」按钮，记录你的第一个任务',
  },
  'no-plans': {
    icon: '○',
    title: '今天没有计划',
    subtitle: '随时点击开始记录',
  },
  'all-blank': {
    icon: '○',
    title: '0% 已记录',
    subtitle: '点击按钮，看见你的时间',
  },
}

export default function EmptyState({ variant }: EmptyStateProps) {
  const { icon, title, subtitle } = config[variant]

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-4xl text-text-muted mb-4" aria-hidden="true">{icon}</span>
      <p className="text-text-secondary font-medium">{title}</p>
      <p className="text-sm text-text-muted mt-1">{subtitle}</p>
    </div>
  )
}
