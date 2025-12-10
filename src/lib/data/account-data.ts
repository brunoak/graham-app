"use server"

import { createClient } from "@/lib/supabase/server"

export interface AccountDTO {
    id: number
    name: string
}

export async function getAccounts(): Promise<AccountDTO[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data: profile } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single()

    if (!profile) return []

    const { data: accounts } = await supabase
        .from("accounts")
        .select("id, name")
        .eq("tenant_id", profile.tenant_id)
        .order("name")

    return accounts || []
}
