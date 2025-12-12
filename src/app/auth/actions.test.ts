import { describe, it, expect, vi, beforeEach } from "vitest"
import { login } from "./actions"

// Mocks
const mockSignInWithPassword = vi.fn()
const mockSupabase = {
    auth: {
        signInWithPassword: mockSignInWithPassword
    }
}

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => Promise.resolve(mockSupabase))
}))

vi.mock("next/navigation", () => ({
    redirect: vi.fn()
}))

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn()
}))

describe("Auth Actions - Login", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("should return validation error for invalid email", async () => {
        const formData = new FormData()
        formData.append("email", "invalid-email")
        formData.append("password", "123456")

        const result = await login(formData)

        expect(result).toHaveProperty("error")
        expect(result?.error).toContain("E-mail inválido")
        expect(mockSignInWithPassword).not.toHaveBeenCalled()
    })

    it("should return validation error for short password", async () => {
        const formData = new FormData()
        formData.append("email", "test@example.com")
        formData.append("password", "123") // Too short

        const result = await login(formData)

        expect(result).toHaveProperty("error")
        expect(result?.error).toContain("Senha deve ter no mínimo 6 caracteres")
        expect(mockSignInWithPassword).not.toHaveBeenCalled()
    })

    it("should call supabase and return error on auth failure", async () => {
        const formData = new FormData()
        formData.append("email", "test@example.com")
        formData.append("password", "password123")

        mockSignInWithPassword.mockResolvedValueOnce({
            data: null,
            error: { message: "Invalid login credentials" }
        })

        const result = await login(formData)

        expect(mockSignInWithPassword).toHaveBeenCalledWith({
            email: "test@example.com",
            password: "password123"
        })
        expect(result).toHaveProperty("error")
        expect(result?.error).toContain("Credenciais inválidas")
    })

    it("should redirect on success", async () => {
        const formData = new FormData()
        formData.append("email", "test@example.com")
        formData.append("password", "password123")

        mockSignInWithPassword.mockResolvedValueOnce({
            data: { session: {} },
            error: null
        })

        // Import redirect mock to check calls
        const { redirect } = await import("next/navigation")

        // Note: redirect() in Next.js throws an error ("NEXT_REDIRECT"). 
        // We usually expect it to throw or use a mock that doesn't throw if we just want to verify the call.
        // My mock above is vi.fn(), so it won't throw.

        await login(formData)

        expect(mockSignInWithPassword).toHaveBeenCalled()
        expect(redirect).toHaveBeenCalledWith("/dashboard")
    })
})
