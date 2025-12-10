"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface CategoryDTO {
    id?: string
    name: string
    description?: string
    type: string
    classification: string
    icon: string
    color: string
}

export async function getCategories() {
    const supabase = await createClient()

    // Query combines defaults (is_default=true) AND user's tenant categories
    // The RLS policy should handle the filtering, but explicit filter is safer for logic
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Unauthorized")

    // Get tenant_id
    const { data: profile } = await supabase.from("users").select("tenant_id").eq("id", user.id).single()
    if (!profile) throw new Error("Profile not found")

    const newId = crypto.randomUUID()

    const { error } = await supabase
        .from('categories')
        .insert({
            id: newId,
            tenant_id: profile.tenant_id,
            name: data.name,
            description: data.description,
            type: data.type,
            classification: data.classification,
            icon: data.icon,
            color: data.color,
            is_default: false
        })

    if (error) {
        console.error("Error creating category:", error)
        throw new Error("Erro ao criar categoria")
    }

    revalidatePath("/dashboard")
    return newId
}

export async function updateCategory(id: string, data: CategoryDTO) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Security: RLS will block update if not owner, but good to wrap
    const { error } = await supabase
        .from('categories')
        .update({
            name: data.name,
            description: data.description,
            type: data.type,
            classification: data.classification,
            icon: data.icon,
            color: data.color
        })
        .eq('id', id)
        .eq('is_default', false) // Prevent editing defaults just in case

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
