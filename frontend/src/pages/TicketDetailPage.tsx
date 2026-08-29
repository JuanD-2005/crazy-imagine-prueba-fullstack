import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CategoryBadge, PriorityBadge, StatusBadge, Tag } from '../components/Badge'
import { useAuth } from '../features/auth/useAuth'
import { ApiError, apiRequest } from '../lib/api-client'
import type { Ticket, TicketStatus } from '../types'

const POLLING_STATUSES = new Set(['pending', 'processing'])

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'open', label: 'Abierto' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'resolved', label: 'Resuelto' },
  { value: 'closed', label: 'Cerrado' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-VE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function StatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: TicketStatus
  onChange: (value: TicketStatus) => void
  disabled: boolean
}) {
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as TicketStatus)}
        className="appearance-none rounded-md border border-(--line-strong) bg-[#08090a] py-1 pr-6 pl-2.5 text-[10.5px] tracking-wide text-(--muted) transition hover:border-white/20 hover:text-[#eee] disabled:cursor-wait disabled:opacity-50"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 10 6"
        fill="none"
        className="pointer-events-none absolute top-1/2 right-2 h-1.5 w-2.5 -translate-y-1/2 text-(--muted-dim)"
      >
        <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const query = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => apiRequest<Ticket>(`/tickets/${id}`),
    refetchInterval: (currentQuery) => {
      const enrichmentStatus = currentQuery.state.data?.enrichmentStatus
      return enrichmentStatus && POLLING_STATUSES.has(enrichmentStatus) ? 3000 : false
    },
  })

  const updateStatus = useMutation({
    mutationFn: (status: TicketStatus) =>
      apiRequest<Ticket>(`/tickets/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['ticket', id], updated)
    },
  })

  const canEditStatus =
    !!user &&
    !!query.data &&
    (user.role === 'admin' ||
      query.data.createdById === user.id ||
      query.data.assignedToId === user.id)

  const isAdmin = user?.role === 'admin'

  const deleteTicket = useMutation({
    mutationFn: () => apiRequest<void>(`/tickets/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      navigate('/tickets', { state: { deleted: true } })
    },
  })

  const handleDeleteClick = () => {
    if (window.confirm('¿Eliminar este ticket? Esta acción no se puede deshacer.')) {
      deleteTicket.mutate()
    }
  }

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

          <div className="mb-2 flex items-center gap-1.5">
            {canEditStatus ? (
              <StatusSelect
                value={query.data.status}
                disabled={updateStatus.isPending}
                onChange={(status) => updateStatus.mutate(status)}
              />
            ) : (
              <StatusBadge status={query.data.status} />
            )}
            <PriorityBadge priority={query.data.priority} />
            <CategoryBadge category={query.data.category} />
            {updateStatus.isPending && (
              <span className="text-[11px] text-(--muted-dim)">Guardando…</span>
            )}
          </div>

          {updateStatus.isError && (
            <p className="mb-3 text-[12px] text-red-300">
              {updateStatus.error instanceof ApiError
                ? updateStatus.error.status === 403
                  ? 'No tenés permiso para cambiar el estado de este ticket.'
                  : updateStatus.error.message
                : 'No se pudo actualizar el estado. Intentá de nuevo.'}
            </p>
          )}

          <div className="mb-5" />

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
            </div>
          )}

          {query.data.enrichmentStatus === 'done' &&
            query.data.suggestedReply && (
              <div className="mt-3.5 rounded-[14px] border-l-2 border-neon bg-[linear-gradient(135deg,rgba(204,255,0,0.06),rgba(204,255,0,0.015)_60%)] px-6 py-5.5">
                <div className="mb-2.5 flex items-center gap-1.5 text-[10px] font-medium text-neon">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-[11px] w-[11px]">
                    <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
                  </svg>
                  Respuesta sugerida por IA
                </div>
                <p className="text-[13px] leading-relaxed text-[#dfe3da]">
                  {query.data.suggestedReply}
                </p>
              </div>
            )}

          {isAdmin && (
            <div className="mt-6 border-t border-(--line) pt-5">
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={deleteTicket.isPending}
                className="rounded-[10px] border border-red-500/30 bg-red-500/5 px-4 py-2.5 text-[12.5px] font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-wait disabled:opacity-50"
              >
                {deleteTicket.isPending ? 'Eliminando…' : 'Eliminar ticket'}
              </button>
              {deleteTicket.isError && (
                <p className="mt-2 text-[12px] text-red-300">
                  {deleteTicket.error instanceof ApiError
                    ? deleteTicket.error.message
                    : 'No se pudo eliminar el ticket. Intentá de nuevo.'}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
