
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Or SERVICE_ROLE if available for admin check, but ANON is fine if we log in or just checking public if RLS off (RLS is on).

// Using Service Role to bypass RLS and see what is actually in the DB for debugging
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    console.error("No SUPABASE_SERVICE_ROLE_KEY found in .env.local. Cannot bypass RLS for debug.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAssets() {
    console.log("Checking ALL assets in DB (Service Role Bypass)...");

    const { data: assets, error } = await supabase
        .from("assets")
        .select("*");

    if (error) {
        console.error("Error fetching assets:", error);
        return;
    }

    console.log(`Found ${assets.length} total assets in the database.`);

    if (assets.length > 0) {
        console.log("Sample Assets:");
        assets.slice(0, 5).forEach(a => {
            console.log(`- ID: ${a.id}, Ticker: ${a.ticker}, Qty: ${a.quantity}, Tenant: ${a.tenant_id}`);
        });
    } else {
        console.log("Database 'assets' table is effectively empty.");
    }

    console.log("\nChecking Users...");
    const { data: users } = await supabase.from("users").select("id, email, tenant_id");
    if (users) {
        console.log(`Found ${users.length} users.`);
        users.forEach(u => console.log(`- User: ${u.email} (ID: ${u.id}) -> Tenant: ${u.tenant_id}`));
    }
}

checkAssets();
