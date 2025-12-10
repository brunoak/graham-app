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
    // We prefer category_id now, but keep category name for legacy/fallback
    category: z.string().optional(),
    category_id: z.string().optional(),
    via: z.string().min(1, "Conta é obrigatória"),
    currency: z.enum(["BRL", "USD"]).default("BRL"),
    isRecurring: z.boolean().default(false).optional(),
})

export type TransactionInput = z.input<typeof transactionSchema>
