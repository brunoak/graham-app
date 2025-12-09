import { describe, it, expect, vi, beforeEach } from "vitest"
import { createTransaction } from "./transaction-actions"
import { transactionSchema } from "../schemas/transaction-schema"

// Mocks
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockIlike = vi.fn()

const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
}))

// Chain setup
mockInsert.mockReturnValue({ select: mockSelect })
mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle, ilike: mockIlike })
mockEq.mockReturnValue({ single: mockSingle, ilike: mockIlike })
mockIlike.mockReturnValue({ single: mockSingle })

// Supabase Client Mock
const mockAuthGetUser = vi.fn()
const mockSupabase = {
    auth: { getUser: mockAuthGetUser },
    from: mockFrom
}

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => Promise.resolve(mockSupabase))
}))

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn()
}))

describe("createTransaction", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Reset chain returns
        mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle, ilike: mockIlike })
        mockEq.mockReturnValue({ single: mockSingle, ilike: mockIlike })
        mockInsert.mockReturnValue({ select: mockSelect })
    })

    it("should throw error if user is not authenticated", async () => {
        mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: new Error("No session") })

        const input = {
            type: "expense" as const, // Fix type inference
            amount: 100,
            name: "Test",
            date: new Date(),
            category: "Food",
            via: "Cash"
        }

        await expect(createTransaction(input)).rejects.toThrow("Unauthorized")
    })

    it("should throw error if amount is negative (Zod Validation)", async () => {
        mockAuthGetUser.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null })

        const input = {
            type: "expense" as const,
            amount: -50,
            name: "Test",
            date: new Date(),
            category: "Food",
            via: "Cash"
        }

        await expect(createTransaction(input)).rejects.toThrow("Dados inválidos")
    })

    it("should create a transaction successfully", async () => {
        // 1. Auth Success
        mockAuthGetUser.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null })

        // 2. Tenant Fetch Success
        mockSingle.mockResolvedValueOnce({ data: { tenant_id: 1 }, error: null })
        // Note: The order of mocks depends on execution flow:
        // 1. .from("users").select(...).eq(...).single() -> Returns tenant

        // 3. Category Fetch (Found)
        // .from("categories")...ilike(...).single()
        mockSingle.mockResolvedValueOnce({ data: { id: 10 }, error: null })

        // 4. Account Fetch (Found)
        // .from("accounts")...ilike(...).single()
        mockSingle.mockResolvedValueOnce({ data: { id: 20 }, error: null })

        // 5. Transaction Insert
        // .from("transactions").insert(...).select().single()
        const mockTx = { id: 999, amount: 100 }
        mockSingle.mockResolvedValueOnce({ data: mockTx, error: null })

        const input = {
            type: "expense" as const,
            amount: 100,
            name: "Almoço",
            date: new Date(),
            category: "Food",
            via: "Nubank"
        }

        const result = await createTransaction(input)

        expect(result).toEqual(mockTx)
        expect(mockFrom).toHaveBeenCalledWith("transactions")
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
            amount: 100,
            category_id: 10, // from mock
            account_id: 20 // from mock
        }))
    })
})
