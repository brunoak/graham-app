
import { google } from '@ai-sdk/google';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey) {
    console.error("No API Key found in env (run within app context or hardcode properly)");
    process.exit(1);
}

// We will use native fetch to check models because SDK masks the list call usually
async function listModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.models) {
            console.log("Available Models:");
            data.models.forEach((m: any) => console.log(`- ${m.name} (${m.displayName})`));
        } else {
            console.error("Error fetching models:", data);
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

listModels();
