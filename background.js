// background.js
// This file will handle alarms, notifications, and background tasks.

// --- Constants ---
const DAILY_GREETING_ALARM_NAME = 'dailyGreetingAlarm';
const BIRTHDAY_CHECK_ALARM_NAME = 'dailyBirthdayCheck';
const CUSTOM_REMINDER_ALARM_PREFIX = 'customReminderAlarm_'; // Prefix for custom alarm names

// --- TTS from background ---
function speakInBackground(text) {
    chrome.storage.local.get(['voiceName', 'spokenRemindersEnabled', 'voiceGreetingEnabled'], (settings) => {
        const lowerText = text.toLowerCase();

        if (lowerText.startsWith("reminder:") && !settings.spokenRemindersEnabled) {
            console.log("Spoken reminders disabled, skipping reminder TTS.");
            return;
        }
        
        if (!lowerText.startsWith("reminder:") && !settings.voiceGreetingEnabled) {
            console.log("Voice greetings disabled, skipping non-reminder TTS.");
            return;
        }

        chrome.tts.getVoices(voices => {
            let chosenVoice = null;
            if (settings.voiceName) {
                chosenVoice = voices.find(v => v.name === settings.voiceName);
            }
            chrome.tts.speak(text, {
                voiceName: chosenVoice ? chosenVoice.voiceName : undefined,
                onEvent: function(event) {
                    if (event.type === 'error') {
                        console.error('TTS Error in background:', event.errorMessage, 'Text:', text);
                    }
                }
            });
        });
    });
}

// --- Alarm Management ---
function scheduleDailyGreetingAlarm() {
    const now = new Date();
    let nextGreetingTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0, 0); 
    if (now.getHours() >= 10) { 
        nextGreetingTime.setDate(nextGreetingTime.getDate() + 1); 
    }
    while (nextGreetingTime.getDay() === 0 || nextGreetingTime.getDay() === 6) { 
        nextGreetingTime.setDate(nextGreetingTime.getDate() + 1);
    }
    chrome.alarms.create(DAILY_GREETING_ALARM_NAME, {
        when: nextGreetingTime.getTime(),
        periodInMinutes: 24 * 60 
    });
    console.log(`Daily greeting alarm scheduled for: ${nextGreetingTime}`);
}

function scheduleBirthdayCheckAlarm() {
    const now = new Date();
    let nextCheckTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 5, 0, 0); 
     if (now.getHours() >= 0 && now.getMinutes() >=5) { 
        nextCheckTime.setDate(nextCheckTime.getDate() + 1);
    }
    chrome.alarms.create(BIRTHDAY_CHECK_ALARM_NAME, {
        when: nextCheckTime.getTime(),
        periodInMinutes: 24 * 60
    });
    console.log(`Birthday check alarm scheduled for: ${nextCheckTime}`);
}

// --- Custom Reminder Alarm Scheduling & Cancelling ---
function scheduleSpecificCustomReminder(reminder) {
    if (!reminder || !reminder.id || !reminder.time || !reminder.text) {
        console.error("Invalid reminder object for scheduling:", reminder);
        return;
    }

    const [hours, minutes] = reminder.time.split(':');
    const now = new Date();
    let reminderDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    // If the time is already past for today, schedule it for tomorrow (or handle date if implemented)
    // For now, we assume reminders are for "today" or the next occurrence of that time.
    // A more robust solution would involve a date picker in the UI.
    if (reminderDateTime <= now) {
        // If we allow setting reminders for past times today that should have already fired,
        // we might not want to schedule them, or handle them differently.
        // For simplicity, if it's past, we'll assume it's for the next day.
        // This logic might need refinement if a date field is added.
        // For now, we'll just log if it's past and not schedule.
        // OR, if it's for today but past, and we want to schedule for *next* occurrence:
        // reminderDateTime.setDate(reminderDateTime.getDate() + 1);
        console.log(`Reminder time ${reminder.time} for "${reminder.text}" is in the past for today. Not scheduling.`);
        // To ensure it doesn't get stuck, let's clear any old alarm for this ID.
        chrome.alarms.clear(CUSTOM_REMINDER_ALARM_PREFIX + reminder.id);
        return; // Don't schedule alarms for past times unless explicitly for a future date.
    }

    chrome.alarms.create(CUSTOM_REMINDER_ALARM_PREFIX + reminder.id, {
        when: reminderDateTime.getTime()
        // No periodInMinutes, as these are one-time alarms for now.
        // If recurring custom reminders are needed, this would change.
    });
    console.log(`Custom reminder "${reminder.text}" scheduled for: ${reminderDateTime} with alarm name: ${CUSTOM_REMINDER_ALARM_PREFIX + reminder.id}`);
}

function cancelSpecificCustomReminder(reminderId) {
    const alarmName = CUSTOM_REMINDER_ALARM_PREFIX + reminderId;
    chrome.alarms.clear(alarmName, (wasCleared) => {
        if (wasCleared) {
            console.log(`Cancelled alarm: ${alarmName}`);
        } else {
            console.log(`No alarm found to cancel with name: ${alarmName}`);
        }
    });
}

// Function to re-schedule all active custom reminders on startup/install
function rescheduleAllCustomReminders() {
    chrome.storage.local.get({ customReminders: [] }, (result) => {
        const now = new Date();
        const validReminders = [];
        result.customReminders.forEach(reminder => {
            const [hours, minutes] = reminder.time.split(':');
            let reminderDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
            
            if (reminderDateTime > now) { // Only schedule if it's in the future for today
                scheduleSpecificCustomReminder(reminder);
                validReminders.push(reminder); // Keep it if it's still valid for today
            } else {
                // Optionally, clear past reminders from storage here or mark them as "fired"
                console.log(`Reminder "${reminder.text}" at ${reminder.time} is past for today. Not rescheduling.`);
            }
        });
        // If we want to auto-clear past reminders from storage:
        // chrome.storage.local.set({ customReminders: validReminders });
        // And then tell the popup to refresh:
        // chrome.runtime.sendMessage({ action: "refreshReminders" });
    });
}


// --- Event Listeners ---
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed or updated:', details.reason);
    scheduleDailyGreetingAlarm();
    scheduleBirthdayCheckAlarm();
    rescheduleAllCustomReminders(); // Schedule any existing custom reminders

    chrome.storage.local.get(['voiceGreetingEnabled', 'spokenRemindersEnabled'], (result) => {
        const defaults = {};
        if (result.voiceGreetingEnabled === undefined) defaults.voiceGreetingEnabled = false;
        if (result.spokenRemindersEnabled === undefined) defaults.spokenRemindersEnabled = true;
        if (Object.keys(defaults).length > 0) chrome.storage.local.set(defaults);
    });
});

chrome.runtime.onStartup.addListener(() => {
    console.log('Browser started.');
    chrome.alarms.get(DAILY_GREETING_ALARM_NAME, alarm => { if (!alarm) scheduleDailyGreetingAlarm(); });
    chrome.alarms.get(BIRTHDAY_CHECK_ALARM_NAME, alarm => { if (!alarm) scheduleBirthdayCheckAlarm(); });
    rescheduleAllCustomReminders(); // Re-check and schedule custom reminders
});

chrome.alarms.onAlarm.addListener((alarm) => {
    console.log('Alarm triggered:', alarm.name);

    if (alarm.name === DAILY_GREETING_ALARM_NAME) {
        const today = new Date();
        const dayOfWeek = today.getDay(); 
        if (dayOfWeek >= 1 && dayOfWeek <= 5) { 
            chrome.storage.local.get({ userProfile: null }, (result) => {
                if (result.userProfile && result.userProfile.name) {
                    const greetingMessage = `Hey ${result.userProfile.name}, Good morning! Have a great day.`;
                    speakInBackground(greetingMessage); 
                    console.log("10 AM weekday greeting triggered for:", result.userProfile.name);
                } else {
                    console.log("10 AM: Greeting not triggered (no profile/name).");
                }
            });
        } else {
            console.log("It's a weekend. No 10 AM greeting.");
        }
    } else if (alarm.name === BIRTHDAY_CHECK_ALARM_NAME) {
        chrome.storage.local.get({ userProfile: null }, (result) => { 
            if (result.userProfile && result.userProfile.dob && result.userProfile.name) {
                const dob = new Date(result.userProfile.dob);
                const today = new Date();
                if (dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate()) {
                    const birthdayMessage = `Happy Birthday, ${result.userProfile.name}! Hope you have a wonderful day!`;
                    chrome.notifications.create(`birthdayNotif-${Date.now()}`, {
                        type: 'basic', iconUrl: 'icons/icon128.png',
                        title: 'Happy Birthday!', message: `Happy Birthday, ${result.userProfile.name}!`, priority: 2
                    });
                    speakInBackground(birthdayMessage);
                }
            }
        });
    } else if (alarm.name.startsWith(CUSTOM_REMINDER_ALARM_PREFIX)) {
        const reminderId = alarm.name.substring(CUSTOM_REMINDER_ALARM_PREFIX.length);
        chrome.storage.local.get({ customReminders: [] }, (result) => {
            const reminder = result.customReminders.find(r => r.id === reminderId);
            if (reminder) {
                console.log(`Custom reminder triggered: ${reminder.text} at ${reminder.time}`);
                chrome.notifications.create(`customNotif-${reminder.id}-${Date.now()}`, {
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'Reminder!',
                    message: reminder.text,
                    priority: 2,
                    // buttons: [{ title: 'Mark as Done' }, { title: 'Snooze (5 min)'}] // Optional buttons
                });
                speakInBackground(`Reminder: ${reminder.text}`);

                // Remove the reminder from storage after it has fired (as it's one-time)
                const updatedReminders = result.customReminders.filter(r => r.id !== reminderId);
                chrome.storage.local.set({ customReminders: updatedReminders }, () => {
                    // Optionally, tell the popup to refresh its list of upcoming reminders
                    chrome.runtime.sendMessage({ action: "refreshReminders" }).catch(e => console.log("Popup not open or error sending refresh message:", e));
                });
            } else {
                console.warn("Fired alarm for a custom reminder that was not found in storage:", alarm.name);
            }
        });
    }
});

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scheduleCustomReminder" && request.reminder) {
        scheduleSpecificCustomReminder(request.reminder);
        sendResponse({ status: "Custom reminder scheduling attempted." });
        return true; // Indicates asynchronous response
    } else if (request.action === "cancelCustomReminder" && request.reminderId) {
        cancelSpecificCustomReminder(request.reminderId);
        sendResponse({ status: "Custom reminder cancellation attempted." });
        return true; // Indicates asynchronous response
    }
    // Keep this for other messages if any (like speak from popup, though less common for background)
    return false; // No async response for other message types from this listener
});


// Handle notification button click (currently no buttons defined that need action here)
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    console.log("Notification button clicked:", notificationId, buttonIndex);
    // Example: if (notificationId.startsWith('customNotif-') && buttonIndex === 0) { /* Mark as done logic */ }
});
