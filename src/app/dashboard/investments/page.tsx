import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { InvestmentsContent } from "@/components/investments/investments-content"
import { DashboardSummary } from "@/components/dashboard/dashboard-summary"

export default async function InvestmentsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    return <InvestmentsContent summary={<DashboardSummary />} />
}
