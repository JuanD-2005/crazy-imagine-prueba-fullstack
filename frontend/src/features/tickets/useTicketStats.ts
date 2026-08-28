import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '../../lib/api-client'
import type { PaginatedTickets } from '../../types'

function useTicketCount(params: Record<string, string>) {
  return useQuery({
    queryKey: ['tickets-count', params],
    queryFn: () =>
      apiRequest<PaginatedTickets>('/tickets', { params: { ...params, limit: '1' } }),
    select: (data) => data.total,
  })
}

/**
 * Conteos reales vía GET /tickets (reusa el campo `total` de la respuesta
 * paginada, pidiendo limit=1 para no traer datos que no se usan). Respeta
 * la visibilidad por rol del backend — un agent ve el total de SUS tickets,
 * no el global.
 *
 * "resolved" no está acotado a "hoy": la API no tiene filtro de rango de
 * fechas todavía, así que es el total histórico de tickets resueltos, no
 * "resueltos hoy" como sugería el mock original.
 */
export function useTicketStats() {
  const open = useTicketCount({ status: 'open' })
  const urgent = useTicketCount({ priority: 'urgent' })
  const resolved = useTicketCount({ status: 'resolved' })

  return { open: open.data, urgent: urgent.data, resolved: resolved.data }
}
