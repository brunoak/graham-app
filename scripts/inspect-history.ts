
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspectHistory() {
    console.log("Fetching last 10 entries from ia_history...")

    const { data, error } = await supabase
        .from('ia_history')
        .select('id, question, created_at, context_json')
        .order('created_at', { ascending: false })
        .limit(10)

    if (error) {
        console.error("Error fetching history:", error)
        return
    }

    console.log(`Found ${data.length} entries.`)
    data.forEach((item: any) => {
        console.log(`--------------------------------------------------`)
        console.log(`ID: ${item.id}`)
        console.log(`Question: ${item.question}`)
        console.log(`Created: ${item.created_at}`)
        console.log(`Context JSON:`, JSON.stringify(item.context_json, null, 2))
    })
}

inspectHistory()
