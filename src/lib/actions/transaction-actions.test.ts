import { describe, it, expect, vi, beforeEach } from "vitest"
import { createTransaction, updateTransaction, deleteTransaction } from "./transaction-actions"

// Supabase Mock Setup
const mockAuthGetUser = vi.fn()

// Recursive Chain Builder
const createMockChain = () => {
    const chain: any = {}

    chain.select = vi.fn().mockReturnValue(chain)
    chain.insert = vi.fn().mockReturnValue(chain)
    chain.update = vi.fn().mockReturnValue(chain)
    chain.delete = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.single = vi.fn().mockReturnValue(chain) // Default return, overridden in tests
    chain.ilike = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnThis()

    // Alias common entry points
    chain.from = vi.fn().mockReturnValue(chain)
    chain.auth = {
        getUser: mockAuthGetUser
    }

    return chain
}

// Global instance to control in tests
const supabaseMock = createMockChain()

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => Promise.resolve(supabaseMock))
}))

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn()
}))

describe("Transaction Actions", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Reset default chain behavior (return self)
        supabaseMock.select.mockReturnValue(supabaseMock)
        supabaseMock.insert.mockReturnValue(supabaseMock)
        supabaseMock.update.mockReturnValue(supabaseMock)
        supabaseMock.delete.mockReturnValue(supabaseMock)
        supabaseMock.eq.mockReturnValue(supabaseMock)
        supabaseMock.ilike.mockReturnValue(supabaseMock)
        supabaseMock.single.mockResolvedValue({ data: null, error: null })

        // Reset from to return the chain
        supabaseMock.from.mockReturnValue(supabaseMock)
    })

    describe("createTransaction", () => {
        it("should throw error if user is not authenticated", async () => {
            mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: new Error("No session") })
            const input = { type: "expense" as const, amount: 100, name: "Test", date: new Date(), category: "Food", via: "Cash" }
            await expect(createTransaction(input)).rejects.toThrow("Unauthorized")
        })

        it("should throw error if amount is negative (Zod Validation)", async () => {
            mockAuthGetUser.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null })
            const input = { type: "expense" as const, amount: -50, name: "Test", date: new Date(), category: "Food", via: "Cash" }
            await expect(createTransaction(input)).rejects.toThrow("Dados inválidos")
        })

        it("should create a transaction successfully", async () => {
            mockAuthGetUser.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null })

            // Sequence of calls: 
            // 1. Tenant Check (users table)
            // 2. Category Check (categories table)
            // 3. Account Check (accounts table)
            // 4. Insert Transaction (transactions table)

            // We mock .single() to return values in sequence
            supabaseMock.single
                .mockResolvedValueOnce({ data: { tenant_id: 1 }, error: null }) // Tenant
                .mockResolvedValueOnce({ data: { id: 10 }, error: null }) // Category
                .mockResolvedValueOnce({ data: { id: 20 }, error: null }) // Account
                .mockResolvedValueOnce({ data: { id: 999, amount: 100 }, error: null }) // Transaction result

            const input = { type: "expense" as const, amount: 100, name: "Lunch", date: new Date(), category: "Food", via: "Nubank" }
            const result = await createTransaction(input)

            expect(result).toEqual({ id: 999, amount: 100 })
            // Verify Insert Payload
            expect(supabaseMock.insert).toHaveBeenCalledWith(expect.objectContaining({
                amount: -100,
                category_id: 10,
                account_id: 20
            }))
        })
    })

    describe("updateTransaction", () => {
        it("should update successfully", async () => {
            mockAuthGetUser.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null })

            supabaseMock.single
                .mockResolvedValueOnce({ data: { tenant_id: 1 }, error: null }) // Tenant
                .mockResolvedValueOnce({ data: { id: 10 }, error: null }) // Category
                .mockResolvedValueOnce({ data: { id: 20 }, error: null }) // Account

            // Mock the .update().eq().eq().select() chain
            // The code awaits the result of .select().
            // Since .single() is NOT called, it returns { data: [T], error }

            const thenableChain: any = {
                ...supabaseMock,
                // Critical: select() must return this thenable object so 'await' works on it
                select: vi.fn(),
                eq: vi.fn().mockReturnThis(),
                then: (resolve: any) => resolve({ data: [{ id: 999, name: "Updated" }], error: null })
            }
            thenableChain.select.mockReturnValue(thenableChain)
            thenableChain.eq.mockReturnValue(thenableChain)

            // We need to ensure that the chain returned by .update() eventually leads here
            supabaseMock.update.mockReturnValue(thenableChain)
            // And any intermediate .eq() calls also need to keep returning this thenable chain

            const input = { type: "expense" as const, amount: 200, name: "Updated Lunch", date: new Date(), category: "Food", via: "Nubank" }

            await updateTransaction(999, input)

            expect(supabaseMock.from).toHaveBeenCalledWith("transactions")
            expect(supabaseMock.update).toHaveBeenCalled()
        })
    })

    describe("deleteTransaction", () => {
        it("should delete successfully", async () => {
            mockAuthGetUser.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null })

            // Sequence:
            // 1. Tenant Check
            // 2. Delete Transaction (returns array via select() usually, or .single() if used?)
            //    Code uses .delete()...select() WITHOUT .single() at the end? 
            //    Let's check code: `.delete()...select()` returns { data: [], error }. 
            //    It does NOT call single().

            supabaseMock.single.mockResolvedValueOnce({ data: { tenant_id: 1 }, error: null }) // Tenant

            // For the delete call, select() is the terminator in terms of value return (Promise-like)
            // But in our chain, methods return 'chain'.
            // The code awaits the chain. 
            // To simulate the 'await' result, the implementation must return a Promise.
            // The logic: supabase...delete()...select() -> Returns Promise<{ data, error }>

            // With this recursive mock, `chain.select()` returns `chain`.
            // Calling `await chain` works if `chain` is a thenable (Promise).
            // But our chain is an object.

            // FIX: We need the terminator method to return a Promise-like object OR Make the chain a Promise proxy.
            // EASIER FIX: Mock the LAST method called in the chain to return the data promise.
            // In deleteTransaction: `.select()` is the last call.

            // We need to override select implementation conditionally OR make select return a Promise that resolves to {data, error} AND has chain methods?
            // Complex.
            // Alternative: The code awaits `supabase...select()`.
            // So `select()` MUST return a Promise (or be thenable).

            // Let's make `select` returns a Promise that resolves to { data: [deleted], error: null }
            // BUT `createTransaction` chains `.select().single()`.
            // So for create, `select` must return an object with `single`.

            // Solution: `select` returns an object that matches BOTH needs?
            // 1. Has `.single()` method.
            // 2. Is thenable (has `.then`) -> acts as Promise.

            const thenableChain = {
                ...supabaseMock,
                then: (resolve: any) => resolve({ data: [{ id: 999 }], error: null }),
                single: vi.fn(), // If single is called, it returns promise (mocked below)
                eq: vi.fn().mockReturnThis()
            }
            // Bind recursiveness
            thenableChain.single.mockReturnValue(Promise.resolve({ data: { id: 999 }, error: null }))

            // Override select for this test
            supabaseMock.select.mockReturnValue(thenableChain)

            await deleteTransaction(999)

            expect(supabaseMock.delete).toHaveBeenCalled()
        })
    })
})
