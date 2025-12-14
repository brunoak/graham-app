import { describe, it, expect, vi, beforeEach } from "vitest"
import { createInvestmentTransaction } from "./investment-actions"

const mocks = vi.hoisted(() => {
    return {
        authGetUser: vi.fn(),
        single: vi.fn(),
        eq: vi.fn(),
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        from: vi.fn(),
        order: vi.fn()
    }
})

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => Promise.resolve({
        from: mocks.from,
        auth: { getUser: mocks.authGetUser }
    }))
}))

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn()
}))

describe("Investment Actions - PM Logic", () => {
    beforeEach(() => {
        vi.clearAllMocks()

        const chain: any = {
            select: mocks.select,
            insert: mocks.insert,
            update: mocks.update,
            eq: mocks.eq,
            single: mocks.single,
            order: mocks.order,
            then: (r: any) => r({ error: null }) // Make chain thenable (default success)
        }

        mocks.from.mockReturnValue(chain)
        mocks.select.mockReturnValue(chain)
        mocks.insert.mockReturnValue(chain) // Insert is also thenable via chain
        mocks.update.mockReturnValue(chain)
        mocks.eq.mockReturnValue(chain)
        mocks.order.mockReturnValue(chain)

        // Default Auth Success
        mocks.authGetUser.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null })
    })

    it("should create new asset on first buy", async () => {
        // Queue mockSingle responses
        // 1. Profile (getAuthenticatedUser)
        mocks.single.mockResolvedValueOnce({ data: { tenant_id: 100 }, error: null })
        // 2. Asset Check (createInvestmentTransaction)
        mocks.single.mockResolvedValueOnce({ data: null, error: null })

        // 3. Asset Creation (insert -> select -> single)
        mocks.single.mockResolvedValueOnce({ data: { id: "new-asset-id" }, error: null })

        // Insert automatically returns success via chain.then

        const input: any = {
            ticker: "ITUB4",
            type: "buy",
            quantity: 100,
            price: 30.00,
            total: 3000.00,
            date: new Date(),
            assetType: "stock_br"
        }

        await createInvestmentTransaction(input)

        // Argument check
        // Check 1st insert (Asset)
        expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
            ticker: "ITUB4",
            quantity: 100,
            average_price: 30.00
        }))
    })

    it("should update PM correctly on second buy", async () => {
        // 1. Profile
        mocks.single.mockResolvedValueOnce({ data: { tenant_id: 100 }, error: null })

        // 2. Asset Found
        mocks.single.mockResolvedValueOnce({
            data: {
                id: "asset-1",
                quantity: 100,
                average_price: 30.00
            },
            error: null
        })

        // No need to override eq or insert, chain handles it.

        const input: any = {
            ticker: "ITUB4",
            type: "buy",
            quantity: 100,
            price: 40.00,
            total: 4000.00,
            date: new Date()
        }

        await createInvestmentTransaction(input)

        expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
            quantity: 200,
            average_price: 35.00
        }))
    })

    it("should NOT change PM on sell", async () => {
        mocks.single.mockResolvedValueOnce({ data: { tenant_id: 100 }, error: null })
        mocks.single.mockResolvedValueOnce({
            data: {
                id: "asset-1",
                quantity: 200,
                average_price: 35.00
            },
            error: null
        })

        const input: any = {
            ticker: "ITUB4",
            type: "sell",
            quantity: 50,
            price: 50.00,
            total: 2500.00,
            date: new Date()
        }

        await createInvestmentTransaction(input)

        expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
            quantity: 150,
            average_price: 35.00
        }))
    })

    it("should throw error if selling more than owned", async () => {
        mocks.single.mockResolvedValueOnce({ data: { tenant_id: 100 }, error: null })
        mocks.single.mockResolvedValueOnce({
            data: {
                id: "asset-1",
                quantity: 10,
                average_price: 10.00
            },
            error: null
        })

        const input: any = {
            ticker: "ITUB4",
            type: "sell",
            quantity: 20,
            price: 10.00,
            total: 200.00,
            date: new Date()
        }

        await expect(createInvestmentTransaction(input))
            .rejects.toThrow("Quantidade insuficiente")
    })
})
