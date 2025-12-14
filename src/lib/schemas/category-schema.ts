import { z } from "zod"

export const categorySchema = z.object({
    name: z.string().min(2, { message: "Nome deve ter no mínimo 2 caracteres" }),
    description: z.string().optional(),
    type: z.string().min(1, { message: "Tipo é obrigatório" }),
    classification: z.enum(["Despesa", "Receita", "Investimentos", "Investimento", "Despesa Futura", "Educação", "Lazer"] as const),
    icon: z.string().min(1, { message: "Ícone é obrigatório" }),
    color: z.string().optional().default("text-gray-500"),
    is_default: z.boolean().optional(),
})

export type CategoryInput = z.infer<typeof categorySchema>
