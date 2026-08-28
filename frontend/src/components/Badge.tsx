import type { ReactNode } from 'react'

type BadgeColor = 'gray' | 'blue' | 'yellow' | 'orange' | 'red' | 'green' | 'purple'

const COLOR_CLASSES: Record<BadgeColor, string> = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-700',
  yellow: 'bg-yellow-100 text-yellow-800',
  orange: 'bg-orange-100 text-orange-700',
  red: 'bg-red-100 text-red-700',
  green: 'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700',
}

export function Badge({
  children,
  color = 'gray',
}: {
  children: ReactNode
  color?: BadgeColor
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${COLOR_CLASSES[color]}`}
    >
      {children}
    </span>
  )
}

const STATUS_LABELS: Record<string, { label: string; color: BadgeColor }> = {
  open: { label: 'Abierto', color: 'blue' },
  in_progress: { label: 'En progreso', color: 'yellow' },
  resolved: { label: 'Resuelto', color: 'green' },
  closed: { label: 'Cerrado', color: 'gray' },
}

const PRIORITY_LABELS: Record<string, { label: string; color: BadgeColor }> = {
  low: { label: 'Baja', color: 'gray' },
  medium: { label: 'Media', color: 'blue' },
  high: { label: 'Alta', color: 'orange' },
  urgent: { label: 'Urgente', color: 'red' },
}

const CATEGORY_LABELS: Record<string, { label: string; color: BadgeColor }> = {
  billing: { label: 'Facturación', color: 'purple' },
  technical: { label: 'Técnico', color: 'blue' },
  account: { label: 'Cuenta', color: 'green' },
  other: { label: 'Otro', color: 'gray' },
}

export function StatusBadge({ status }: { status: string }) {
  const info = STATUS_LABELS[status] ?? { label: status, color: 'gray' as const }
  return <Badge color={info.color}>{info.label}</Badge>
}

export function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) {
    return <Badge color="gray">Sin clasificar</Badge>
  }
  const info = PRIORITY_LABELS[priority] ?? { label: priority, color: 'gray' as const }
  return <Badge color={info.color}>{info.label}</Badge>
}

export function CategoryBadge({ category }: { category: string | null }) {
  if (!category) {
    return <Badge color="gray">Sin categoría</Badge>
  }
  const info = CATEGORY_LABELS[category] ?? { label: category, color: 'gray' as const }
  return <Badge color={info.color}>{info.label}</Badge>
}
