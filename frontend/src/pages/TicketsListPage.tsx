import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { TicketRow } from '../features/tickets/TicketRow'
import { useTicketStats } from '../features/tickets/useTicketStats'
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

const selectClass =
  'appearance-none rounded-lg border border-(--line-strong) bg-[#08090a] px-3 py-2.5 pr-8 text-[11.5px] text-(--muted) transition hover:border-white/20 hover:text-[#eee]'

function FilterSelect({
  value,
  onChange,
  options,
  labelPrefix,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  labelPrefix?: string
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectClass}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {labelPrefix ? `${labelPrefix}${option.label}` : option.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 10 6"
        fill="none"
        className="pointer-events-none absolute top-1/2 right-3 h-1.5 w-2.5 -translate-y-1/2 text-(--muted-dim)"
      >
        <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export function TicketsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const deleted = (location.state as { deleted?: boolean } | null)?.deleted
  const stats = useTicketStats()

  const status = searchParams.get('status') ?? ''
  const priority = searchParams.get('priority') ?? ''
  const category = searchParams.get('category') ?? ''
  const search = searchParams.get('search') ?? ''
  const page = Number(searchParams.get('page') ?? '1')
  const limit = Number(searchParams.get('limit') ?? '10')
  const sortBy = searchParams.get('sortBy') ?? 'createdAt'
  const sortOrder = searchParams.get('sortOrder') ?? 'desc'

  const [searchDraft, setSearchDraft] = useState(search)

  useEffect(() => {
    setSearchDraft(search)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchDraft === search) return
      updateParams({ search: searchDraft || undefined }, true)
    }, 300)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft])

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
      {deleted && (
        <p className="mb-4 rounded-md border border-neon/20 bg-neon/8 px-3 py-2 text-center text-[12.5px] text-neon">
          Ticket eliminado correctamente.
        </p>
      )}

      <div className="mb-6 flex items-end justify-between">
        <h1 className="font-heading text-[26px] font-semibold tracking-tight text-[#eef1e9]">
          Tickets
        </h1>
        <Link
          to="/tickets/new"
          className="btn-sheen rounded-[9px] bg-neon px-4 py-2.5 font-mono text-[12.5px] font-medium text-[#0a0c06] transition hover:-translate-y-px hover:shadow-[0_4px_20px_-4px_rgba(204,255,0,0.45)]"
        >
          Nuevo ticket
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3.5">
        <div className="rounded-[14px] border border-(--line) bg-panel px-5 py-4.5">
          <div className="mb-2.5 text-[10.5px] tracking-wide text-(--muted-dim) uppercase">
            Open
          </div>
          <div className="font-heading text-[30px] font-semibold text-[#f2f4ee]">
            {stats.open ?? '—'}
          </div>
        </div>

        <div className="stat-border">
          <div className="h-full rounded-[13px] bg-[#050605] px-5 py-4.5">
            <div className="mb-2.5 flex items-center gap-1.5 text-[10.5px] tracking-wide text-(--muted-dim) uppercase">
              <span className="h-[5px] w-[5px] animate-pulse-dot rounded-full bg-neon shadow-[0_0_5px_1px_rgba(204,255,0,0.8)]" />
              Urgent
            </div>
            <div className="font-heading text-[30px] font-semibold text-neon">
              {stats.urgent ?? '—'}
            </div>
          </div>
        </div>

        <div className="rounded-[14px] border border-(--line) bg-panel px-5 py-4.5">
          <div className="mb-2.5 text-[10.5px] tracking-wide text-(--muted-dim) uppercase">
            Resueltos
          </div>
          <div className="font-heading text-[30px] font-semibold text-[#f2f4ee]">
            {stats.resolved ?? '—'}
          </div>
        </div>
      </div>

      <div className="mb-3.5 flex items-center gap-2.5 rounded-[11px] border border-(--line-strong) bg-[#08090a] px-3.5 py-3 transition focus-within:border-neon/40 focus-within:shadow-[0_0_0_3px_rgba(204,255,0,0.06)]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-3.5 w-3.5 shrink-0 text-(--muted-dim)"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Buscar por título o descripción…"
          className="flex-1 bg-transparent font-mono text-[13px] text-[#eef1e9] outline-none placeholder:text-(--muted-dim)"
        />
        <div className="hidden items-center gap-0.5 rounded-md border border-(--line-strong) bg-[#0f100f] px-1.75 py-0.75 text-[10.5px] tracking-wide text-(--muted) sm:flex">
          ⌘ K
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2.5">
        <FilterSelect
          value={status}
          onChange={(value) => updateParams({ status: value || undefined }, true)}
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          value={priority}
          onChange={(value) => updateParams({ priority: value || undefined }, true)}
          options={PRIORITY_OPTIONS}
        />
        <FilterSelect
          value={category}
          onChange={(value) => updateParams({ category: value || undefined }, true)}
          options={CATEGORY_OPTIONS}
        />
        <FilterSelect
          value={sortBy}
          onChange={(value) => updateParams({ sortBy: value }, true)}
          options={SORT_OPTIONS}
          labelPrefix="Ordenar por: "
        />
        <FilterSelect
          value={sortOrder}
          onChange={(value) => updateParams({ sortOrder: value }, true)}
          options={[
            { value: 'desc', label: 'Descendente' },
            { value: 'asc', label: 'Ascendente' },
          ]}
        />
      </div>

      {query.isLoading && (
        <ul className="space-y-2">
          {[...Array(5)].map((_, index) => (
            <li
              key={index}
              className="h-16 animate-pulse rounded-[14px] border border-(--line) bg-panel"
            />
          ))}
        </ul>
      )}

      {query.isError && (
        <div className="rounded-[14px] border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="mb-3 text-[13px] text-red-300">
            No se pudieron cargar los tickets.
          </p>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="rounded-lg border border-red-500/30 bg-transparent px-4 py-2 text-[12.5px] font-medium text-red-300 transition hover:bg-red-500/10"
          >
            Reintentar
          </button>
        </div>
      )}

      {query.data && query.data.data.length === 0 && (
        <div className="rounded-[14px] border border-(--line) bg-panel p-10 text-center">
          <p className="text-[13px] font-medium text-[#eef1e9]">
            No se encontraron tickets
          </p>
          <p className="mt-1 text-[12.5px] text-(--muted)">
            Probá ajustar los filtros o el texto de búsqueda.
          </p>
        </div>
      )}

      {query.data && query.data.data.length > 0 && (
        <>
          <div className="overflow-hidden rounded-[14px] border border-(--line) bg-panel">
            {query.data.data.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-[12px] text-(--muted)">
            <span>
              {query.data.total} ticket{query.data.total === 1 ? '' : 's'} · página{' '}
              {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
                className="rounded-lg border border-(--line-strong) px-3 py-1.5 font-medium transition hover:border-white/20 hover:text-[#eee] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
                className="rounded-lg border border-(--line-strong) px-3 py-1.5 font-medium transition hover:border-white/20 hover:text-[#eee] disabled:cursor-not-allowed disabled:opacity-40"
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
