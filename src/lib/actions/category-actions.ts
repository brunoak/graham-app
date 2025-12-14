"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

import { categorySchema, CategoryInput } from "@/lib/schemas/category-schema"
import { randomUUID } from "crypto"

export type CategoryDTO = CategoryInput & { id?: string }

export async function getCategories() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

    if (error) {
        console.error("Error fetching categories:", error)
        return []
    }

    return data
}

export async function createCategory(data: CategoryDTO) {
    try {
        const validation = categorySchema.safeParse(data)
        if (!validation.success) {
            return { error: `Dados inválidos: ${validation.error.issues[0].message}` }
        }

        const validData = validation.data
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { error: "Unauthorized" }

        const { data: profile } = await supabase.from("users").select("tenant_id").eq("id", user.id).single()
        if (!profile) return { error: "Profile not found" }

        // Generate UUID because DB column is TEXT (confirmed by migration error)
        const newId = randomUUID()

        const { data: newCategory, error } = await supabase
            .from('categories')
            .insert({
                id: newId,
                tenant_id: profile.tenant_id,
                name: validData.name,
                description: validData.description,
                type: validData.type,
                classification: validData.classification,
                icon: validData.icon,
                color: validData.color,
                is_default: false
            })
            .select()
            .single()

        if (error) {
            console.error("Error creating category:", error)
            return { error: `Erro SQL: ${error.message} (Code: ${error.code})` }
        }

        revalidatePath("/dashboard")
        return { data: newCategory.id.toString() }
    } catch (e: any) {
        console.error("Unexpected error:", e)
        return { error: `Erro inesperado: ${e.message}` }
    }
}

export async function updateCategory(id: string, data: CategoryDTO) {
    // For update, we might want partial validation? 
    // But the UI usually sends the full object. DTO implies full object.
    const validation = categorySchema.safeParse(data)
    if (!validation.success) {
        throw new Error(`Dados inválidos: ${validation.error.issues[0].message}`)
    }

    const validData = validation.data
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { error } = await supabase
        .from('categories')
        .update({
            name: validData.name,
            description: validData.description,
            type: validData.type,
            classification: validData.classification,
            icon: validData.icon,
            color: validData.color
        })
        .eq('id', id)
        .eq('is_default', false)

    if (error) {
        console.error("Error updating category:", error)
        throw new Error("Erro ao atualizar categoria")
    }

    revalidatePath("/dashboard")
}

export async function deleteCategory(id: string) {
    const supabase = await createClient()

    // Check if used in transactions? 
    // Ideally yes, but for now let's just allow delete. 
    // Optional: Update transactions to 'default' or null.
    // Let's Simple Delete. RLS prevents deleting defaults.

    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('is_default', false)

    if (error) {
        console.error("Error deleting category:", error)
        throw new Error("Erro ao excluir categoria")
    }

    revalidatePath("/dashboard")
}
