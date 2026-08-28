import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Badge, CategoryBadge, PriorityBadge, StatusBadge } from '../components/Badge'
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
    <div className="mx-auto max-w-2xl">
      <Link to="/tickets" className="mb-4 inline-block text-sm text-gray-500 hover:text-gray-700">
        ← Volver a tickets
      </Link>

      {query.isLoading && (
        <div className="space-y-3">
          <div className="h-7 w-2/3 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100" />
          <div className="h-24 w-full animate-pulse rounded-lg bg-gray-100" />
        </div>
      )}

      {query.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="mb-3 text-sm text-red-700">
            {query.error instanceof ApiError && query.error.status === 403
              ? 'No tenés acceso a este ticket.'
              : query.error instanceof ApiError && query.error.status === 404
                ? 'Este ticket no existe.'
                : 'No se pudo cargar el ticket.'}
          </p>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
          >
            Reintentar
          </button>
        </div>
      )}

      {query.data && (
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-start justify-between gap-4">
              <h1 className="text-xl font-semibold text-gray-900">
                {query.data.title}
              </h1>
              <span className="whitespace-nowrap text-xs text-gray-500">
                {formatDate(query.data.createdAt)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={query.data.status} />
              <PriorityBadge priority={query.data.priority} />
              <CategoryBadge category={query.data.category} />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-1 text-sm font-medium text-gray-700">Descripción</h2>
            <p className="whitespace-pre-wrap text-sm text-gray-600">
              {query.data.description}
            </p>
          </div>

          {POLLING_STATUSES.has(query.data.enrichmentStatus) && (
            <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
              <p className="text-sm text-blue-800">
                Enriqueciendo ticket… la clasificación automática está en
                proceso.
              </p>
            </div>
          )}

          {query.data.enrichmentStatus === 'failed' && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">
                La clasificación automática de este ticket falló. Podés
                asignarle prioridad y categoría manualmente más adelante.
              </p>
            </div>
          )}

          {query.data.enrichmentStatus === 'done' && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-medium text-gray-700">
                Enriquecimiento automático
              </h2>
              <div className="mb-3 flex flex-wrap gap-2">
                <PriorityBadge priority={query.data.priority} />
                <CategoryBadge category={query.data.category} />
                {query.data.tags.map((tag) => (
                  <Badge key={tag} color="gray">
                    {tag}
                  </Badge>
                ))}
              </div>
              {query.data.suggestedReply && (
                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-700">
                    Respuesta sugerida
                  </h3>
                  <p className="whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-sm text-gray-600">
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
