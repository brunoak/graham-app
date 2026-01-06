import { NextResponse } from "next/server"
import { getRecentChats } from "@/lib/actions/arkad-actions"

export async function GET() {
    try {
        console.log("[API] Fetching recent chats for drawer...")
        const chats = await getRecentChats(20)
        console.log("[API] getRecentChats returned:", chats?.length, "chats")

        // Transform to drawer-friendly format
        // getRecentChats returns: { id, question (title), created_at, answer, context_json }
        const conversations = chats.map((chat: any) => ({
            id: String(chat.id),
            title: chat.question?.substring(0, 40) + (chat.question?.length > 40 ? "..." : "") || "Conversa",
            date: new Date(chat.created_at).toLocaleDateString('pt-BR')
        }))

        console.log("[API] Returning conversations:", conversations.length)
        return NextResponse.json({ conversations })
    } catch (error) {
        console.error("[API] Failed to get conversations:", error)
        return NextResponse.json({ conversations: [] })
    }
}
