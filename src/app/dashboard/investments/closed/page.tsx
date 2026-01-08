import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getClosedPositions, getClosedPositionsSummary, getAvailableSellYears } from "@/lib/actions/closed-positions-actions"
import { ClosedPositionsContent } from "@/components/investments/closed-positions-content"

interface ClosedPositionsPageProps {
    searchParams: Promise<{
        month?: string
        year?: string
    }>
}

export default async function ClosedPositionsPage(props: ClosedPositionsPageProps) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    const searchParams = await props.searchParams

    // Parse filters from URL
    const year = searchParams.year ? parseInt(searchParams.year) : undefined
    const month = searchParams.month ? parseInt(searchParams.month) : undefined
    const filters = year ? { year, month } : undefined

    // Fetch data
    const [positions, summary, availableYears] = await Promise.all([
        getClosedPositions(filters),
        getClosedPositionsSummary(filters),
        getAvailableSellYears()
    ])

    return (
        <ClosedPositionsContent
            positions={positions}
            summary={summary}
            availableYears={availableYears}
            currentFilters={{ year, month }}
        />
    )
}
