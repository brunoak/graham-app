
import { ArkadDashboard } from "@/components/arkad/arkad-dashboard"
import { createClient } from "@/lib/supabase/server"
import { getRecentChats, getAIUsage, getChatThread } from "@/lib/actions/arkad-actions"

interface ArkadPageProps {
    searchParams: Promise<{ id?: string }>
}

export default async function ArkadPage(props: ArkadPageProps) {
    const searchParams = await props.searchParams;
    const { id } = searchParams
    const recentChats = await getRecentChats(10)
    const usageStats = await getAIUsage()

    let initialMessages: any[] = []

    if (id) {
        // Try to fetch as a thread first
        const thread = await getChatThread(id)

        if (thread && thread.length > 0) {
            // Reconstruct messages from history items
            initialMessages = thread.flatMap(item => [
                {
                    id: String(item.id) + '_user',
                    role: 'user',
                    content: item.question
                },
                {
                    id: String(item.id) + '_assistant',
                    role: 'assistant',
                    content: item.answer || ''
                }
            ])
        } else {
            // Fallback: Check if it's a legacy ID in recent chats
            // We ensure string comparison to avoid type mismatches
            const selectedChat = recentChats.find(chat => String(chat.id) === String(id))

            if (selectedChat) {
                initialMessages = [
                    {
                        id: String(selectedChat.id) + '_user',
                        role: 'user',
                        content: selectedChat.question
                    },
                    {
                        id: String(selectedChat.id) + '_assistant',
                        role: 'assistant',
                        content: selectedChat.answer || ''
                    }
                ]
            }
        }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.user_metadata?.name?.split(' ')[0] || 'Investidor'

    return (
        <ArkadDashboard
            initialChats={recentChats}
            usageStats={usageStats}
            initialMessages={initialMessages}
            userName={userName}
        />
    )
}
