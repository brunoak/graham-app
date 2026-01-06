import { NextResponse } from "next/server"
import { getChatThread } from "@/lib/actions/arkad-actions"

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params
        console.log("[API] Fetching conversation:", id)

        const thread = await getChatThread(id)
        console.log("[API] getChatThread returned:", thread?.length, "messages")

        if (!thread || thread.length === 0) {
            return NextResponse.json({ messages: [] })
        }

        // Transform to drawer-friendly format
        // getChatThread returns: { id, question, created_at, answer }
        const messages = thread.flatMap((item: any) => [
            {
                id: `${item.id}_user`,
                role: "user",
                content: item.question
            },
            {
                id: `${item.id}_assistant`,
                role: "assistant",
                content: item.answer || ""
            }
        ])

        console.log("[API] Returning messages:", messages.length)
        return NextResponse.json({ messages })
    } catch (error) {
        console.error("[API] Failed to get conversation:", error)
        return NextResponse.json({ messages: [] })
    }
}
