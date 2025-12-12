import { describe, it, expect, vi, beforeEach } from "vitest"
import { createCategory, updateCategory, deleteCategory } from "./category-actions"

// Supabase Mock Setup
const mockAuthGetUser = vi.fn()
const mockSelect = vi.fn().mockReturnThis()
const mockInsert = vi.fn().mockReturnThis()
const mockUpdate = vi.fn().mockReturnThis()
const mockDelete = vi.fn().mockReturnThis()
const mockEq = vi.fn().mockReturnThis()
const mockSingle = vi.fn()
const mockOrder = vi.fn().mockReturnThis()

const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
}))

// Bind chain methods
mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder, single: mockSingle })
mockInsert.mockReturnValue({ select: mockSelect, single: mockSingle })
mockUpdate.mockReturnValue({ eq: mockEq }) // Update chain: update().eq().eq()
mockDelete.mockReturnValue({ eq: mockEq }) // Delete chain: delete().eq().eq()
mockEq.mockReturnValue({ eq: mockEq, select: mockSelect, single: mockSingle }) // Chain continuation

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => Promise.resolve({
        from: mockFrom,
        auth: { getUser: mockAuthGetUser }
    }))
}))

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn()
}))

// Mock crypto.randomUUID
vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "new-cat-id") })

describe("Category Actions", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Default mocks
        mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder, single: mockSingle })
        // Important: update().eq() returns chain
        mockEq.mockReturnValue({ eq: mockEq, select: mockSelect, single: mockSingle })
    })

    it("should validation error for invalid category data", async () => {
        const input: any = {
            name: "A", // Too short
            type: "", // Empty
            classification: "Invalid",
            icon: "",
        }
        await expect(createCategory(input)).rejects.toThrow("Dados inválidos")
    })

    it("should throw error if unauthorized", async () => {
        const input: any = {
            name: "Valid Name",
            type: "Test",
            classification: "Despesa",
            icon: "Icon",
            color: "text-red-500"
        }
        mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: new Error("No Auth") })

        await expect(createCategory(input)).rejects.toThrow("Unauthorized")
    })

    it("should create category successfully", async () => {
        mockAuthGetUser.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null })
        mockSingle.mockResolvedValue({ data: { tenant_id: 100 }, error: null }) // Profile check

        // Mock Insert Return
        mockInsert.mockReturnValue({
            error: null
        })

        // Wait, implementation: .insert({...}) returns { error } directly if not followed by select.
        // In category-actions.ts:46: await supabase.from('categories').insert({...})
        // It does NOT call select().
        // So mockInsert needs to return a Promise-like or object with error directly?
        // Code: await supabase...insert(...) -> returns { error }
        // So mockInsert must return { error: null }? No, it's awaited.
        // If I mockReturnValue, "await" works on the value.
        // Supabase `insert` returns a PostgrestBuilder which is thenable.

        mockInsert.mockReturnValue(Promise.resolve({ error: null }))

        const input: any = {
            name: "New Category",
            type: "Essentials",
            classification: "Despesa",
            icon: "Home",
            color: "text-blue-500"
        }

        const id = await createCategory(input)
        expect(id).toBe("new-cat-id")
        expect(mockFrom).toHaveBeenCalledWith("categories")
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
            name: "New Category",
            tenant_id: 100
        }))
    })

    it("should update category successfully", async () => {
        mockAuthGetUser.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null })

        // Implementation: update(...).eq(...).eq(...)
        // await result -> { error }
        // The chain must end with a Promise resolving to { error }

        // Mock chain for update:
        // update() -> { eq: fn }
        // eq() -> { eq: fn }
        // eq() -> Promise({ error })

        const endPromise = Promise.resolve({ error: null })
        const eq2 = vi.fn().mockReturnValue(endPromise)
        const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
        mockUpdate.mockReturnValue({ eq: eq1 })

        const input: any = {
            name: "Updated Name",
            type: "Essentials",
            classification: "Despesa",
            icon: "Home",
            color: "text-blue-500"
        }

        await updateCategory("cat-1", input)
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ name: "Updated Name" }))
    })

    it("should delete category successfully", async () => {
        // deleteCategory implementation: delete().eq().eq()
        const endPromise = Promise.resolve({ error: null })
        const eq2 = vi.fn().mockReturnValue(endPromise)
        const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
        mockDelete.mockReturnValue({ eq: eq1 })

        await deleteCategory("cat-1")
        expect(mockDelete).toHaveBeenCalled()
    })
})
