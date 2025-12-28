import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIAHistory() {
    console.log("Fetching ia_history entries...\n");

    const { data, error } = await supabase
        .from("ia_history")
        .select("id, question, context_json, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Found ${data.length} entries.\n`);

    data.forEach((entry, i) => {
        console.log(`--- Entry ${i + 1} ---`);
        console.log(`ID: ${entry.id}`);
        console.log(`Question: ${entry.question?.substring(0, 50)}...`);
        console.log(`Date: ${entry.created_at}`);
        console.log(`Context JSON:`);
        console.log(JSON.stringify(entry.context_json, null, 2));
        console.log("\n");
    });
}

checkIAHistory();
