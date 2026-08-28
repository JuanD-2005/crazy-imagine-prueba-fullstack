import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { CategoryBadge, PriorityBadge, StatusBadge, Tag } from '../components/Badge'
import { ApiError, apiRequest } from '../lib/api-client'
import type { Ticket } from '../types'

const POLLING_STATUSES = new Set(['pending', 'processing'])

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-VE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()

  const query = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => apiRequest<Ticket>(`/tickets/${id}`),
    refetchInterval: (currentQuery) => {
      const enrichmentStatus = currentQuery.state.data?.enrichmentStatus
      return enrichmentStatus && POLLING_STATUSES.has(enrichmentStatus) ? 3000 : false
    },
  })

  return (
    <div className="mx-auto max-w-[680px]">
      <Link
        to="/tickets"
        className="mb-5 inline-flex items-center gap-1.5 text-[12px] text-(--muted) transition hover:gap-2.5 hover:text-neon"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[13px] w-[13px]">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Volver a tickets
      </Link>

      {query.isLoading && (
        <div className="space-y-3">
          <div className="h-7 w-2/3 animate-pulse rounded bg-white/5" />
          <div className="h-4 w-full animate-pulse rounded bg-white/5" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-white/5" />
          <div className="h-24 w-full animate-pulse rounded-[14px] bg-white/5" />
        </div>
      )}

      {query.isError && (
        <div className="rounded-[14px] border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="mb-3 text-[13px] text-red-300">
            {query.error instanceof ApiError && query.error.status === 403
              ? 'No tenés acceso a este ticket.'
              : query.error instanceof ApiError && query.error.status === 404
                ? 'Este ticket no existe.'
                : 'No se pudo cargar el ticket.'}
          </p>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="rounded-lg border border-red-500/30 px-4 py-2 text-[12.5px] font-medium text-red-300 transition hover:bg-red-500/10"
          >
            Reintentar
          </button>
        </div>
      )}

      {query.data && (
        <div>
          <div className="mb-3.5 flex items-start justify-between gap-5">
            <h1 className="font-heading text-[26px] font-semibold tracking-tight text-[#eef1e9]">
              {query.data.title}
            </h1>
            <span className="pt-1.5 text-[11.5px] whitespace-nowrap text-(--muted-dim)">
              {formatDate(query.data.createdAt)}
            </span>
          </div>

          <div className="mb-7 flex gap-1.5">
            <StatusBadge status={query.data.status} />
            <PriorityBadge priority={query.data.priority} />
            <CategoryBadge category={query.data.category} />
          </div>

          <div className="mb-3.5 rounded-[14px] border border-(--line) bg-panel px-6 py-5.5">
            <div className="mb-3 text-[10.5px] tracking-wide text-(--muted-dim) uppercase">
              Descripción
            </div>
            <p className="text-sm leading-relaxed text-[#dfe3da]">
              {query.data.description}
            </p>
          </div>

          {POLLING_STATUSES.has(query.data.enrichmentStatus) && (
            <div className="relative overflow-hidden rounded-[14px] border border-neon/12 bg-panel px-6 py-5.5 before:absolute before:inset-x-5.5 before:top-[-1px] before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(204,255,0,0.6),transparent)]">
              <div className="flex items-center gap-2.5">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-3.5 w-3.5 shrink-0 animate-sparkle text-neon"
                >
                  <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
                </svg>
                <span className="shimmer-text text-sm">
                  Analizando ticket con IA…
                </span>
              </div>
            </div>
          )}

          {query.data.enrichmentStatus === 'failed' && (
            <div className="rounded-[14px] border border-red-500/20 bg-red-500/5 px-6 py-5.5">
              <p className="text-sm text-red-300">
                La clasificación automática de este ticket falló. Podés
                asignarle prioridad y categoría manualmente más adelante.
              </p>
            </div>
          )}

          {query.data.enrichmentStatus === 'done' && (
            <div className="relative rounded-[14px] border border-neon/12 bg-panel px-6 py-5.5 before:absolute before:inset-x-5.5 before:top-[-1px] before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(204,255,0,0.6),transparent)]">
              <div className="mb-3 flex items-center gap-1.5 text-[10px] text-neon">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-[11px] w-[11px]">
                  <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
                </svg>
                Enriquecimiento automático
              </div>
              <div className="flex flex-wrap gap-1.5">
                <PriorityBadge priority={query.data.priority} />
                <CategoryBadge category={query.data.category} />
                {query.data.tags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
              {query.data.suggestedReply && (
                <div className="mt-4">
                  <div className="mb-1.5 text-[10.5px] tracking-wide text-(--muted-dim) uppercase">
                    Respuesta sugerida
                  </div>
                  <p className="rounded-[10px] bg-white/[0.03] p-3.5 text-[13px] leading-relaxed text-[#dfe3da]">
                    {query.data.suggestedReply}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
