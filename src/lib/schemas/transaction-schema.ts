import { z } from "zod"



/**
 * Zod Schema for Transaction Input Validation.
 * Validates data coming from the Frontend Dialog before it reaches the Database logic.
 */
export const transactionSchema = z.object({
    type: z.enum(["income", "expense"]),
    amount: z.coerce.number().positive(),
    name: z.string().min(1, "Nome é obrigatório"),
    description: z.string().optional(),
    date: z.coerce.date(),
    category: z.string().min(1, "Categoria é obrigatória"),
    via: z.string().min(1, "Conta é obrigatória"),
    isRecurring: z.boolean().default(false).optional(),
})

export type TransactionInput = z.input<typeof transactionSchema>
