import type { ReactNode } from 'react'

type TagColor =
  | 'blue'
  | 'yellow'
  | 'red'
  | 'urgent'
  | 'purple'
  | 'green'
  | 'neon'
  | 'muted'

const TAG_COLOR_CLASSES: Record<TagColor, string> = {
  blue: 'text-[#8fb8ff] bg-[#588cff]/8 border-[#588cff]/18',
  yellow: 'text-[#f2c464] bg-[#f2c464]/8 border-[#f2c464]/20',
  red: 'text-[#ff8a8a] bg-[#ff5a5a]/8 border-[#ff5a5a]/22',
  // Un rojo-naranja más saturado y opaco que "red", reservado para urgent: debe
  // leerse como "más grave que high" a simple vista, no como el mismo tono.
  urgent: 'text-[#ffb199] bg-[#ff3d1a]/16 border-[#ff3d1a]/42',
  purple: 'text-[#c99bff] bg-[#b478ff]/8 border-[#b478ff]/20',
  green: 'text-[#8fdca0] bg-[#4ecb6a]/8 border-[#4ecb6a]/20',
  neon: 'text-neon bg-neon/6 border-neon/18',
  muted: 'text-(--muted) bg-white/4 border-(--line-strong)',
}

export function Tag({
  children,
  color = 'muted',
}: {
  children: ReactNode
  color?: TagColor
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[10.5px] tracking-wide whitespace-nowrap ${TAG_COLOR_CLASSES[color]}`}
    >
      {children}
    </span>
  )
}

const STATUS_LABELS: Record<string, { label: string; color: TagColor }> = {
  open: { label: 'Abierto', color: 'blue' },
  in_progress: { label: 'En progreso', color: 'yellow' },
  resolved: { label: 'Resuelto', color: 'green' },
  closed: { label: 'Cerrado', color: 'muted' },
}

const PRIORITY_LABELS: Record<string, { label: string; color: TagColor }> = {
  low: { label: 'Baja', color: 'muted' },
  medium: { label: 'Media', color: 'yellow' },
  high: { label: 'Alta', color: 'red' },
  urgent: { label: 'Urgente', color: 'urgent' },
}

const CATEGORY_LABELS: Record<string, { label: string; color: TagColor }> = {
  billing: { label: 'Facturación', color: 'purple' },
  technical: { label: 'Técnico', color: 'blue' },
  account: { label: 'Cuenta', color: 'green' },
  other: { label: 'Otro', color: 'muted' },
}

export function StatusBadge({ status }: { status: string }) {
  const info = STATUS_LABELS[status] ?? { label: status, color: 'muted' as const }
  return <Tag color={info.color}>{info.label}</Tag>
}

export function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) {
    return <Tag color="muted">Sin clasificar</Tag>
  }
  const info = PRIORITY_LABELS[priority] ?? { label: priority, color: 'muted' as const }
  return <Tag color={info.color}>{info.label}</Tag>
}

export function CategoryBadge({ category }: { category: string | null }) {
  if (!category) {
    return <Tag color="muted">Sin categoría</Tag>
  }
  const info = CATEGORY_LABELS[category] ?? { label: category, color: 'muted' as const }
  return <Tag color={info.color}>{info.label}</Tag>
}

export function ProcessingTag() {
  return (
    <Tag color="neon">
      <span aria-hidden>✦</span> Processing
    </Tag>
  )
}
