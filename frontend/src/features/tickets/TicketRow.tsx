import { Link } from 'react-router-dom'
import { CategoryBadge, PriorityBadge, ProcessingTag, StatusBadge } from '../../components/Badge'
import { useMouseSpotlight } from '../../hooks/useMouseSpotlight'
import { formatRelativeTime } from '../../lib/format-relative-time'
import type { Ticket } from '../../types'

const ENRICHING = new Set(['pending', 'processing'])

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' })
}

export function TicketRow({ ticket }: { ticket: Ticket }) {
  const spotlight = useMouseSpotlight('px')
  const enriching = ENRICHING.has(ticket.enrichmentStatus)

  return (
    <Link
      to={`/tickets/${ticket.id}`}
      className="row-spotlight relative flex items-center justify-between border-b border-(--line) px-5 py-[17px] transition-colors last:border-b-0 hover:bg-white/[0.012]"
      onMouseMove={spotlight.onMouseMove}
      style={spotlight.style}
    >
      <div className="relative z-[1]">
        <div className="mb-1.5 flex items-center gap-2 text-sm text-[#eef1e9]">
          {enriching ? (
            <>
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-[13px] w-[13px] shrink-0 animate-sparkle text-neon"
              >
                <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
              </svg>
              <span className="shimmer-text">Analizando ticket con IA…</span>
            </>
          ) : (
            ticket.title
          )}
        </div>
        <div className="text-[11px] text-(--muted-dim)">
          {formatRelativeTime(ticket.createdAt)}
        </div>
      </div>

      <div className="relative z-[1] flex items-center gap-4">
        {enriching ? (
          <ProcessingTag />
        ) : (
          <div className="flex gap-1.5">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <CategoryBadge category={ticket.category} />
          </div>
        )}
        <div className="w-[150px] text-right text-[11px] text-(--muted-dim)">
          {formatDate(ticket.createdAt)}
        </div>
      </div>
    </Link>
  )
}
