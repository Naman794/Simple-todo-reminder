// discord_logger.js

export const DISCORD_WEBHOOK_URL_KEY = 'discordWebhookUrl';

export async function logToDiscord(message, type = 'info') {
    try {
        const result = await new Promise(resolve => chrome.storage.local.get(DISCORD_WEBHOOK_URL_KEY, resolve));
        const webhookUrl = result[DISCORD_WEBHOOK_URL_KEY];

        if (!webhookUrl) {
            // console.log("Discord webhook URL not configured. Skipping log.");
            return;
        }

        let embedColor = 0x7289DA; // Default Discord blue
        if (type === 'success') embedColor = 0x2ECC71; // Green
        else if (type === 'error') embedColor = 0xE74C3C; // Red
        else if (type === 'warning') embedColor = 0xF1C40F; // Yellow

        const payload = {
            embeds: [{
                title: `Extension Log: ${type.charAt(0).toUpperCase() + type.slice(1)}`,
                description: message,
                color: embedColor,
                timestamp: new Date().toISOString(),
                footer: {
                    text: "Daily Voice Reminder Extension" // You might want to make this dynamic if the extension name changes
                }
            }]
        };

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error(`Discord webhook error: ${response.status} ${response.statusText}`, await response.text());
        } else {
            console.log("Log sent to Discord successfully.");
        }
    } catch (error) {
        console.error("Error sending log to Discord:", error);
    }
}
