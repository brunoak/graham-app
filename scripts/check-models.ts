
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listModels() {
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!key) {
        console.error("No API Key found in .env.local");
        process.exit(1);
    }

    console.log("Checking models with key ending in...", key.slice(-4));

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();

        if (data.error) {
            console.error("API Error:", data.error);
        } else {
            console.log("\nAvailable Models:");
            // Sort by display name or name
            const models = data.models || [];
            models
                .filter((m: any) => m.name.includes('gemini'))
                .forEach((m: any) => {
                    console.log(`- ${m.name} (${m.displayName}) - supportedGenerationMethods: ${m.supportedGenerationMethods}`);
                });
        }
    } catch (error) {
        console.error("Network/Script Error:", error);
    }
}

listModels();
