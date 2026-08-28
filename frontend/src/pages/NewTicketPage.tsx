import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../lib/api-client'
import {
  createTicketSchema,
  type CreateTicketFormValues,
} from '../features/tickets/schemas'
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
      <h1 className="mb-6 text-lg font-semibold text-gray-900">Nuevo ticket</h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
      >
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-gray-700">
            Título
          </label>
          <input
            id="title"
            type="text"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            {...register('title')}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="description"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Descripción
          </label>
          <textarea
            id="description"
            rows={5}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            {...register('description')}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">
              {errors.description.message}
            </p>
          )}
        </div>

        {mutation.isError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            No se pudo crear el ticket. Intentá de nuevo.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate('/tickets')}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Creando…' : 'Crear ticket'}
          </button>
        </div>
      </form>
    </div>
  )
}
