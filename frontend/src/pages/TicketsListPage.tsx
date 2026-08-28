import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CategoryBadge, PriorityBadge, StatusBadge } from '../components/Badge'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { apiRequest } from '../lib/api-client'
import type { PaginatedTickets } from '../types'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'open', label: 'Abierto' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'resolved', label: 'Resuelto' },
  { value: 'closed', label: 'Cerrado' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'Todas las prioridades' },
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
]

const CATEGORY_OPTIONS = [
  { value: '', label: 'Todas las categorías' },
  { value: 'billing', label: 'Facturación' },
  { value: 'technical', label: 'Técnico' },
  { value: 'account', label: 'Cuenta' },
  { value: 'other', label: 'Otro' },
]

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Fecha de creación' },
  { value: 'updatedAt', label: 'Última actualización' },
  { value: 'priority', label: 'Prioridad' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-VE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function TicketsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const status = searchParams.get('status') ?? ''
  const priority = searchParams.get('priority') ?? ''
  const category = searchParams.get('category') ?? ''
  const search = searchParams.get('search') ?? ''
  const page = Number(searchParams.get('page') ?? '1')
  const limit = Number(searchParams.get('limit') ?? '10')
  const sortBy = searchParams.get('sortBy') ?? 'createdAt'
  const sortOrder = searchParams.get('sortOrder') ?? 'desc'

  const [searchDraft, setSearchDraft] = useState(search)
  const debouncedSearch = useDebouncedValue(searchDraft, 300)

  // Si la URL cambia desde afuera (atrás/adelante del navegador), reflejarlo
  // en el input.
  useEffect(() => {
    setSearchDraft(search)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  useEffect(() => {
    if (debouncedSearch === search) return
    updateParams({ search: debouncedSearch || undefined }, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  function updateParams(
    updates: Record<string, string | undefined>,
    resetPage = false,
  ) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
    }
    if (resetPage) {
      next.delete('page')
    }
    setSearchParams(next, { replace: true })
  }

  const query = useQuery({
    queryKey: [
      'tickets',
      { status, priority, category, search, page, limit, sortBy, sortOrder },
    ],
    queryFn: () =>
      apiRequest<PaginatedTickets>('/tickets', {
        params: { status, priority, category, search, page, limit, sortBy, sortOrder },
      }),
    placeholderData: keepPreviousData,
  })

  const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / limit)) : 1

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Tickets</h1>
        <Link
          to="/tickets/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
        >
          Nuevo ticket
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Buscar por título o descripción…"
          className="min-w-[220px] flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />

        <select
          value={status}
          onChange={(event) =>
            updateParams({ status: event.target.value || undefined }, true)
          }
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(event) =>
            updateParams({ priority: event.target.value || undefined }, true)
          }
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={category}
          onChange={(event) =>
            updateParams({ category: event.target.value || undefined }, true)
          }
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(event) => updateParams({ sortBy: event.target.value }, true)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              Ordenar por: {option.label}
            </option>
          ))}
        </select>

        <select
          value={sortOrder}
          onChange={(event) => updateParams({ sortOrder: event.target.value }, true)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="desc">Descendente</option>
          <option value="asc">Ascendente</option>
        </select>
      </div>

      {query.isLoading && (
        <ul className="space-y-2">
          {[...Array(5)].map((_, index) => (
            <li
              key={index}
              className="h-16 animate-pulse rounded-lg border border-gray-200 bg-gray-100"
            />
          ))}
        </ul>
      )}

      {query.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="mb-3 text-sm text-red-700">
            No se pudieron cargar los tickets.
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

      {query.data && query.data.data.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
          <p className="text-sm font-medium text-gray-900">
            No se encontraron tickets
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Probá ajustar los filtros o el texto de búsqueda.
          </p>
        </div>
      )}

      {query.data && query.data.data.length > 0 && (
        <>
          <ul className="space-y-2">
            {query.data.data.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  to={`/tickets/${ticket.id}`}
                  className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm"
                >
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <h2 className="font-medium text-gray-900">{ticket.title}</h2>
                    <span className="whitespace-nowrap text-xs text-gray-500">
                      {formatDate(ticket.createdAt)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
                    <CategoryBadge category={ticket.category} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              {query.data.total} ticket{query.data.total === 1 ? '' : 's'} · página{' '}
              {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
                className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
                className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
