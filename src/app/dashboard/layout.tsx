
import { DashboardNavbar as TopNav } from "@/components/dashboard-navbar"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

// Force rebuild
export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-zinc-950">
            <TopNav user={user} />
            <main className="flex-1 overflow-y-auto w-full">
                <div className="max-w-7xl mx-auto p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
