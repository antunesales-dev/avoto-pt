import { z } from 'zod'

export const emailSchema = z
  .string()
  .trim()
  .email('Indique um email válido.')
  .max(254)

export const passwordSchema = z
  .string()
  .min(8, 'A palavra-passe deve ter pelo menos 8 caracteres.')
  .max(72, 'Palavra-passe demasiado longa.')

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const registoSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    passwordConfirm: z.string(),
    partidoPreferencia: z.string().trim().max(80).optional().or(z.literal('')),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: 'As palavras-passe não coincidem.',
    path: ['passwordConfirm'],
  })

export const votoSchema = z.enum(['favor', 'contra', 'abstencao'])
