
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env.local manually since we can't depend on dotenv being installed globally or working with node easily without setup
const envPath = path.resolve(__dirname, '../.env.local');
let apiKey = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/GOOGLE_GENERATIVE_AI_API_KEY=(.*)/);
    if (match) {
        apiKey = match[1].trim().replace(/['"]/g, ''); // Remove quotes if present
    }
} catch (e) {
    console.error("Could not read .env.local");
}

if (!apiKey) {
    console.error("No API Key found.");
    process.exit(1);
}

console.log("Checking models with key ending in...", apiKey.slice(-4));

https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error("API Error:", json.error);
            } else {
                console.log("\nAvailable Models:");
                const models = json.models || [];
                models
                    .filter(m => m.name.includes('gemini'))
                    .forEach(m => {
                        console.log(`- ${m.name} (${m.displayName})`);
                    });
            }
        } catch (e) {
            console.error("Parse Error", e);
        }
    });
}).on('error', (e) => {
    console.error("Request Error", e);
});
