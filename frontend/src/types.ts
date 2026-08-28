export type UserRole = 'admin' | 'agent'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketCategory = 'billing' | 'technical' | 'account' | 'other'
export type EnrichmentStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface Ticket {
  id: number
  title: string
  description: string
  status: TicketStatus
  createdById: number
  assignedToId: number | null
  priority: TicketPriority | null
  category: TicketCategory | null
  tags: string[]
  suggestedReply: string | null
  enrichmentStatus: EnrichmentStatus
  enrichedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PaginatedTickets {
  data: Ticket[]
  total: number
  page: number
  limit: number
}
