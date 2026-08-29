import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'El email es requerido').email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().min(1, 'El email es requerido').email('Email inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
  inviteCode: z.string().min(1, 'El código de invitación es requerido'),
})

export type RegisterFormValues = z.infer<typeof registerSchema>
