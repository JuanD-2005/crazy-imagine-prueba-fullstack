import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import {
  createTicketSchema,
  type CreateTicketFormValues,
} from '../features/tickets/schemas'
import { apiRequest } from '../lib/api-client'
import type { Ticket } from '../types'

export function NewTicketPage() {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateTicketFormValues>({
    resolver: zodResolver(createTicketSchema),
  })

  const mutation = useMutation({
    mutationFn: (values: CreateTicketFormValues) =>
      apiRequest<Ticket>('/tickets', { method: 'POST', body: values }),
    onSuccess: (ticket) => {
      navigate(`/tickets/${ticket.id}`)
    },
  })

  const onSubmit = (values: CreateTicketFormValues) => {
    mutation.mutate(values)
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 font-heading text-[22px] font-semibold tracking-tight text-[#eef1e9]">
        Nuevo ticket
      </h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-4 rounded-[14px] border border-(--line) bg-panel p-6"
      >
        <div>
          <label
            htmlFor="title"
            className="mb-2 block text-[10.5px] tracking-[0.12em] text-white/38 uppercase"
          >
            Título
          </label>
          <input
            id="title"
            type="text"
            className="w-full rounded-[10px] border border-(--line-strong) bg-[#0d0e0d] px-3.5 py-3 font-mono text-[13.5px] text-[#eef1e9] outline-none transition focus:border-neon/55 focus:shadow-[0_0_0_3px_rgba(204,255,0,0.08)]"
            {...register('title')}
          />
          {errors.title && (
            <p className="mt-1.5 text-[12px] text-red-400">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="description"
            className="mb-2 block text-[10.5px] tracking-[0.12em] text-white/38 uppercase"
          >
            Descripción
          </label>
          <textarea
            id="description"
            rows={5}
            className="w-full rounded-[10px] border border-(--line-strong) bg-[#0d0e0d] px-3.5 py-3 font-mono text-[13.5px] text-[#eef1e9] outline-none transition focus:border-neon/55 focus:shadow-[0_0_0_3px_rgba(204,255,0,0.08)]"
            {...register('description')}
          />
          {errors.description && (
            <p className="mt-1.5 text-[12px] text-red-400">
              {errors.description.message}
            </p>
          )}
        </div>

        {mutation.isError && (
          <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">
            No se pudo crear el ticket. Intentá de nuevo.
          </p>
        )}

        <div className="flex justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => navigate('/tickets')}
            className="rounded-[10px] border border-(--line-strong) px-4 py-2.5 text-[12.5px] font-medium text-(--muted) transition hover:border-white/22 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className="btn-sheen rounded-[10px] bg-neon px-4 py-2.5 font-mono text-[12.5px] font-medium text-[#0a0c06] transition hover:-translate-y-px hover:shadow-[0_4px_24px_-4px_rgba(204,255,0,0.45)] disabled:pointer-events-none disabled:opacity-50"
          >
            {mutation.isPending ? 'Creando…' : 'Crear ticket'}
          </button>
        </div>
      </form>
    </div>
  )
}
