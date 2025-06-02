// background.js
// Handles alarms, notifications, TTS, storage cleanup, and Discord logging.

import { DISCORD_WEBHOOK_URL_KEY, logToDiscord } from './discord_logger.js';

// --- Constants ---
const DAILY_GREETING_ALARM_NAME = 'dailyGreetingAlarm';
const BIRTHDAY_CHECK_ALARM_NAME = 'dailyBirthdayCheck';
const CUSTOM_REMINDER_ALARM_PREFIX = 'customReminderAlarm_'; 

// Helper: Injects toast into active tab — falls back to system notification if tab is unavailable
async function displayCustomToastInActiveTab(message, toastType = 'info') {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Check for valid tab and supported URLs
        if (
            tab &&
            tab.id &&
            tab.url &&
            !tab.url.startsWith('chrome://') &&
            !tab.url.startsWith('about:') &&
            !tab.url.startsWith('file://')
        ) {
            chrome.tabs.sendMessage(tab.id, {
                action: "showCustomToast",
                message,
                toastType
            }, (response) => {
                if (chrome.runtime.lastError) {
                    const msg = chrome.runtime.lastError.message;
                    if (
            msg.includes("The message port closed") ||
            msg.includes("Could not establish connection") ||
            msg.includes("No receiving end")
        ) {
                        // 🔁 Fallback: show system notification instead
                        console.log("Toast injection skipped: no active content script. Using system notification.");
                        chrome.notifications.create({
                            type: 'basic',
                            iconUrl: 'icons/icon128.png',
                            title: 'Reminder',
                            message,
                            priority: 2
                        });
                    } else {
                        console.warn("Toast injection failed:", msg);
                    }
                } else if (response?.status) {
                    console.log("Toast injected successfully.");
                }
            });
        } else {
            // No suitable tab — fallback to system notification
            console.log("No valid tab for toast. Showing system notification.");
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'Reminder',
                message,
                priority: 2
            });
        }
    } catch (error) {
        console.error("Error injecting toast:", error);
        // Optional: fallback
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Reminder',
            message,
            priority: 2
        });
    }
}


// --- TTS in background ---
function speakInBackground(text) {
    chrome.storage.local.get(['voiceName', 'spokenRemindersEnabled', 'voiceGreetingEnabled'], (settings) => {
        const lowerText = text.toLowerCase();

        if (lowerText.startsWith("reminder:") && !settings.spokenRemindersEnabled) return;
        if (!lowerText.startsWith("reminder:") && !settings.voiceGreetingEnabled) return;

        chrome.tts.getVoices(voices => {
            const chosenVoice = settings.voiceName
                ? voices.find(v => v.name === settings.voiceName)
                : undefined;

            chrome.tts.speak(text, {
                voiceName: chosenVoice?.voiceName,
                onEvent: event => {
                    if (event.type === 'error') {
                        console.error('TTS error:', event.errorMessage);
                        logToDiscord(`TTS Error: ${event.errorMessage} for text: \"${text}\"`, 'error');
                    }
                }
            });
        });
    });
}

// --- Alarm Scheduling ---
function scheduleDailyGreetingAlarm() {
    const now = new Date();
    let next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
    if (now.getHours() >= 10) next.setDate(next.getDate() + 1);
    while ([0, 6].includes(next.getDay())) next.setDate(next.getDate() + 1);

    chrome.alarms.create(DAILY_GREETING_ALARM_NAME, {
        when: next.getTime(),
        periodInMinutes: 1440 // 24 hrs
    });
}

function scheduleBirthdayCheckAlarm() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 5, 0);
    if (now.getHours() >= 0 && now.getMinutes() >= 5) next.setDate(next.getDate() + 1);

    chrome.alarms.create(BIRTHDAY_CHECK_ALARM_NAME, {
        when: next.getTime(),
        periodInMinutes: 1440
    });
}

function scheduleSpecificCustomReminder(reminder) {
    if (!reminder || !reminder.id || !reminder.dateTime || !reminder.text) {
        logToDiscord(`Failed to schedule invalid reminder: ${JSON.stringify(reminder)}`, 'error');
        return;
    }

    const time = new Date(reminder.dateTime).getTime();
    if (time <= Date.now() - 60000) {
        logToDiscord(`Reminder in past, not scheduled: \"${reminder.text}\"`, 'warning');
        removePastOrInvalidReminderFromStorage(reminder.id);
        return;
    }

    chrome.alarms.create(CUSTOM_REMINDER_ALARM_PREFIX + reminder.id, { when: time });
    logToDiscord(`Reminder scheduled: \"${reminder.text}\" for ${new Date(time).toLocaleString()}`, 'success');
}

function cancelSpecificCustomReminder(reminderId) {
    chrome.alarms.clear(CUSTOM_REMINDER_ALARM_PREFIX + reminderId);
}

async function removePastOrInvalidReminderFromStorage(reminderId) {
    const result = await new Promise(resolve => chrome.storage.local.get({ customReminders: [] }, resolve));
    const updated = result.customReminders.filter(r => r.id !== reminderId);
    await chrome.storage.local.set({ customReminders: updated });
    logToDiscord(`Reminder cleared from storage (ID: ${reminderId})`, 'info');
}

async function rescheduleAllCustomReminders() {
    const result = await new Promise(resolve => chrome.storage.local.get({ customReminders: [] }, resolve));
    for (const reminder of result.customReminders) {
        const time = new Date(reminder.dateTime).getTime();
        if (time > Date.now() - 60000) {
            scheduleSpecificCustomReminder(reminder);
        } else {
            cancelSpecificCustomReminder(reminder.id);
            await removePastOrInvalidReminderFromStorage(reminder.id);
        }
    }
}

// --- Alarm Events ---
chrome.alarms.onAlarm.addListener((alarm) => {
    console.log('Alarm triggered:', alarm.name);

    if (alarm.name === DAILY_GREETING_ALARM_NAME) {
        const weekday = new Date().getDay();
        if (weekday >= 1 && weekday <= 5) {
            chrome.storage.local.get({ userProfile: null }, (res) => {
                const name = res.userProfile?.name;
                if (name) {
                    const msg = `Hey ${name}, Good morning! Have a great day.`;
                    speakInBackground(msg);
                    logToDiscord(`10 AM Greeting delivered to ${name}.`, 'info');
                }
            });
        }
    } else if (alarm.name === BIRTHDAY_CHECK_ALARM_NAME) {
        chrome.storage.local.get({ userProfile: null }, (res) => {
            const { dob, name } = res.userProfile || {};
            if (dob && name) {
                const now = new Date();
                const birthDate = new Date(dob);
                if (birthDate.getMonth() === now.getMonth() && birthDate.getDate() === now.getDate()) {
                    const msg = `🎂 Happy Birthday, ${name}!`;
                    chrome.notifications.create(`birthday-${Date.now()}`, {
                        type: 'basic',
                        iconUrl: 'icons/icon128.png',
                        title: 'Happy Birthday!',
                        message: msg,
                        priority: 2
                    });
                    speakInBackground(`${msg} Hope you have a wonderful day!`);
                    logToDiscord(`Birthday greeting delivered to ${name}.`, 'success');
                }
            }
        });
    } else if (alarm.name.startsWith(CUSTOM_REMINDER_ALARM_PREFIX)) {
        const id = alarm.name.replace(CUSTOM_REMINDER_ALARM_PREFIX, '');
        chrome.storage.local.get({ customReminders: [] }, (res) => {
            const reminder = res.customReminders.find(r => r.id === id);
            if (reminder) {
                const msg = `Reminder: ${reminder.text}`;
                chrome.notifications.create(`reminder-${Date.now()}`, {
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'Reminder!',
                    message: reminder.text,
                    priority: 2
                });
                speakInBackground(msg);
                logToDiscord(`Reminder Fired: \"${reminder.text}\"`, 'success');
                removePastOrInvalidReminderFromStorage(reminder.id);
            } else {
                logToDiscord(`Reminder alarm fired, but ID ${id} not found in storage.`, 'warning');
            }
        });
    }
});

// --- Runtime Events ---
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed or updated:', details.reason);
    logToDiscord(`Extension ${details.reason}`, 'info');
    scheduleDailyGreetingAlarm();
    scheduleBirthdayCheckAlarm();
    rescheduleAllCustomReminders();
});

chrome.runtime.onStartup.addListener(() => {
    console.log('Browser started');
    logToDiscord('Extension started on browser launch.', 'info');
    scheduleDailyGreetingAlarm();
    scheduleBirthdayCheckAlarm();
    rescheduleAllCustomReminders();
});

// --- Message Events (from popup.js) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scheduleCustomReminder" && request.reminder) {
        scheduleSpecificCustomReminder(request.reminder);
        sendResponse({ status: "Reminder scheduled" });
    }

    if (request.action === "showSystemNotification" && request.message) {
        chrome.notifications.create({
            type: "basic",
            iconUrl: "icons/icon128.png",
            title: "Reminder",
            message: request.message,
            priority: 2
        });
        sendResponse({ status: "Notification shown" });
    }
});

chrome.notifications.onButtonClicked.addListener((notifId, index) => {
    logToDiscord(`Notification button clicked: ${notifId}, Index: ${index}`, 'info');
});

console.log("Sending toast message to tab:", tab.id);

chrome.tabs.sendMessage(tab.id, {
    action: "showCustomToast",
    message,
    toastType
}, (response) => {
    console.log("Response from toast content script:", response);

    if (chrome.runtime.lastError) {
        console.warn("Toast injection failed:", chrome.runtime.lastError.message);
        // Fallback to system notification
    }
});