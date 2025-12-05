import { z } from "zod"

export const loginSchema = z.object({
    email: z.string().email({ message: "E-mail inválido" }),
    password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" }),
})

export const signupSchema = z.object({
    fullName: z.string().min(2, { message: "Nome deve ter no mínimo 2 caracteres" }),
    email: z.string().email({ message: "E-mail inválido" }),
    password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" }),
})
