// background.js
// This file will handle alarms, notifications, and background tasks.

// Import the logger
import { DISCORD_WEBHOOK_URL_KEY, logToDiscord } from './discord_logger.js';

// --- Constants ---
const DAILY_GREETING_ALARM_NAME = 'dailyGreetingAlarm';
const BIRTHDAY_CHECK_ALARM_NAME = 'dailyBirthdayCheck';
const CUSTOM_REMINDER_ALARM_PREFIX = 'customReminderAlarm_'; 

// --- TTS from background ---
function speakInBackground(text) {
    chrome.storage.local.get(['voiceName', 'spokenRemindersEnabled', 'voiceGreetingEnabled'], (settings) => {
        const lowerText = text.toLowerCase();

        if (lowerText.startsWith("reminder:") && !settings.spokenRemindersEnabled) {
            // console.log("Spoken reminders disabled, skipping reminder TTS.");
            return;
        }
        
        if (!lowerText.startsWith("reminder:") && !settings.voiceGreetingEnabled) {
            // console.log("Voice greetings disabled, skipping non-reminder TTS.");
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
                        logToDiscord(`TTS Error: ${event.errorMessage} for text: "${text}"`, 'error');
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
    // console.log(`Daily greeting alarm scheduled for: ${nextGreetingTime}`);
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
    // console.log(`Birthday check alarm scheduled for: ${nextCheckTime}`);
}

// --- Custom Reminder Alarm Scheduling & Cancelling ---
async function removePastOrInvalidReminderFromStorage(reminderId) {
    try {
        const result = await new Promise(resolve => chrome.storage.local.get({ customReminders: [] }, resolve));
        const initialCount = result.customReminders.length;
        const reminderToRemove = result.customReminders.find(r => r.id === reminderId);
        const updatedReminders = result.customReminders.filter(r => r.id !== reminderId);

        if (updatedReminders.length < initialCount) {
            await new Promise(resolve => chrome.storage.local.set({ customReminders: updatedReminders }, resolve));
            console.log(`Removed reminder ID ${reminderId} from storage.`);
            logToDiscord(`Reminder cleared from storage: "${reminderToRemove?.text || reminderId}"`, 'info');
            
            chrome.runtime.sendMessage({ action: "refreshReminders" }).catch(e => console.log("Popup not open or error sending refresh message:", e.message || e));
            // No need to send feedback via showActionFeedback here as it's a background cleanup
        }
    } catch (error) {
        console.error("Error removing reminder from storage:", error);
        logToDiscord(`Error removing reminder ID ${reminderId} from storage: ${error.message}`, 'error');
    }
}


function scheduleSpecificCustomReminder(reminder) {
    if (!reminder || !reminder.id || !reminder.dateTime || !reminder.text) {
        console.error("Invalid reminder object for scheduling:", reminder);
        logToDiscord(`Failed to schedule reminder: Invalid data. ID: ${reminder?.id || 'N/A'}`, 'error');
        if(reminder && reminder.id) removePastOrInvalidReminderFromStorage(reminder.id); // Clean up if possible
        return;
    }

    const scheduleTime = new Date(reminder.dateTime).getTime();
    const now = Date.now();

    // Check if the scheduled time is in the past (e.g. by more than a minute to allow for slight delays)
    if (scheduleTime <= (now - 60000)) { // Allow a 1-minute grace for very near past due to processing
        console.log(`Reminder time for "${reminder.text}" (ID: ${reminder.id}) at ${new Date(reminder.dateTime).toLocaleString()} is in the past. Not scheduling.`);
        logToDiscord(`Attempted to schedule past reminder (not scheduled): "${reminder.text}" for ${new Date(reminder.dateTime).toLocaleString()}`, 'warning');
        chrome.alarms.clear(CUSTOM_REMINDER_ALARM_PREFIX + reminder.id); // Ensure any old alarm is cleared
        removePastOrInvalidReminderFromStorage(reminder.id); // Remove it from storage
        return;
    }

    chrome.alarms.create(CUSTOM_REMINDER_ALARM_PREFIX + reminder.id, {
        when: scheduleTime
    });
    console.log(`Custom reminder "${reminder.text}" (ID: ${reminder.id}) scheduled for: ${new Date(scheduleTime).toLocaleString()} with alarm name: ${CUSTOM_REMINDER_ALARM_PREFIX + reminder.id}`);
    logToDiscord(`Reminder scheduled: "${reminder.text}" for ${new Date(scheduleTime).toLocaleString()}`, 'success');
}

function cancelSpecificCustomReminder(reminderId) {
    const alarmName = CUSTOM_REMINDER_ALARM_PREFIX + reminderId;
    chrome.alarms.clear(alarmName, (wasCleared) => {
        if (wasCleared) {
            console.log(`Cancelled alarm: ${alarmName}`);
            // Logging for cancellation is now handled in the onMessage listener for better context
        } else {
            // It's possible the alarm already fired and was cleared, or was never set due to being in the past.
            console.log(`No alarm found to cancel (or already cleared) with name: ${alarmName}`);
        }
    });
}

async function rescheduleAllCustomReminders() {
    try {
        const result = await new Promise(resolve => chrome.storage.local.get({ customReminders: [] }, resolve));
        let remindersToKeep = []; // Trackers for what's actually kept after this process
        let madeStorageChanges = false;

        if (result.customReminders && result.customReminders.length > 0) {
            logToDiscord(`Rescheduling ${result.customReminders.length} custom reminders on startup/install.`, 'info');
            for (const reminder of result.customReminders) {
                if (reminder.dateTime) {
                    const reminderTimeMs = new Date(reminder.dateTime).getTime();
                    if (reminderTimeMs > (Date.now() - 60000)) { // Check if it's in the future (with 1 min grace)
                        scheduleSpecificCustomReminder(reminder); // This function already checks if it's past
                        remindersToKeep.push(reminder); // Keep it if scheduled or still future
                    } else {
                        console.log(`During reschedule: Reminder "${reminder.text}" (ID: ${reminder.id}) at ${new Date(reminder.dateTime).toLocaleString()} is past. Clearing.`);
                        logToDiscord(`Reschedule: Found past reminder "${reminder.text}". Clearing.`, 'warning');
                        cancelSpecificCustomReminder(reminder.id); // Ensure alarm is cleared
                        // The actual removal from storage will happen if scheduleSpecificCustomReminder is called
                        // or if we explicitly call removePastOrInvalidReminderFromStorage here.
                        // For now, scheduleSpecificCustomReminder handles its own removal logic if it determines it's past.
                        // We just need to ensure we don't keep it in remindersToKeep if it's past.
                        madeStorageChanges = true; // Indicate a potential change to storage
                    }
                } else {
                     console.warn(`During reschedule: Reminder (ID: ${reminder.id}) missing dateTime. Will be removed.`);
                     logToDiscord(`Reschedule: Found reminder ID ${reminder.id} missing dateTime. Clearing.`, 'warning');
                     cancelSpecificCustomReminder(reminder.id);
                     madeStorageChanges = true;
                }
            }
             // If madeChanges implies some reminders were filtered out *before* calling scheduleSpecificCustomReminder
             // (e.g. due to missing dateTime), we need to update storage.
            if (madeStorageChanges && result.customReminders.length !== remindersToKeep.length) {
                await new Promise(resolve => chrome.storage.local.set({ customReminders: remindersToKeep }, resolve));
                console.log("Storage updated after rescheduling, removed past/invalid reminders not caught by scheduleSpecificCustomReminder.");
                chrome.runtime.sendMessage({ action: "refreshReminders" }).catch(e => console.log("Popup not open or error sending refresh message:", e.message || e));
            }

        } else {
            console.log("No custom reminders to reschedule.");
        }
    } catch (error) {
        console.error("Error in rescheduleAllCustomReminders:", error);
        logToDiscord(`Error during rescheduleAllCustomReminders: ${error.message}`, 'error');
    }
}


// --- Event Listeners ---
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed or updated:', details.reason);
    logToDiscord(`Extension ${details.reason}. Version: ${chrome.runtime.getManifest().version}`, 'info');
    scheduleDailyGreetingAlarm();
    scheduleBirthdayCheckAlarm();
    rescheduleAllCustomReminders(); 

    chrome.storage.local.get(['voiceGreetingEnabled', 'spokenRemindersEnabled', DISCORD_WEBHOOK_URL_KEY], (result) => {
        const defaultsToSet = {};
        if (result.voiceGreetingEnabled === undefined) defaultsToSet.voiceGreetingEnabled = false;
        if (result.spokenRemindersEnabled === undefined) defaultsToSet.spokenRemindersEnabled = true;
        
        if (result[DISCORD_WEBHOOK_URL_KEY] === undefined || result[DISCORD_WEBHOOK_URL_KEY] === "") {
            defaultsToSet[DISCORD_WEBHOOK_URL_KEY] = "https://discord.com/api/webhooks/1378404616949071954/6rUxlPetQpM1f7LQp7SoRYovFL02UJBhWQBz7rFL5fGUV-OvXkKRm4namty6YFp-2CQ7";
            logToDiscord("Default Discord webhook URL set during installation.", "info");
        }
        
        if (Object.keys(defaultsToSet).length > 0) {
            chrome.storage.local.set(defaultsToSet, () => {
                if (chrome.runtime.lastError) {
                    console.error("Error setting defaults on install:", chrome.runtime.lastError);
                } else {
                    console.log("Default settings applied on install/update.");
                }
            });
        }
    });
});

chrome.runtime.onStartup.addListener(() => {
    console.log('Browser started.');
    logToDiscord('Browser started. Initializing extension alarms.', 'info');
    chrome.alarms.get(DAILY_GREETING_ALARM_NAME, alarm => { if (!alarm) scheduleDailyGreetingAlarm(); });
    chrome.alarms.get(BIRTHDAY_CHECK_ALARM_NAME, alarm => { if (!alarm) scheduleBirthdayCheckAlarm(); });
    rescheduleAllCustomReminders(); 
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
                    logToDiscord(`10 AM Greeting delivered to ${result.userProfile.name}.`, 'info');
                }
            });
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
                    logToDiscord(`Birthday greeting delivered to ${result.userProfile.name}.`, 'success');
                }
            }
        });
    } else if (alarm.name.startsWith(CUSTOM_REMINDER_ALARM_PREFIX)) {
        const reminderId = alarm.name.substring(CUSTOM_REMINDER_ALARM_PREFIX.length);
        chrome.storage.local.get({ customReminders: [] }, (result) => {
            const reminder = result.customReminders.find(r => r.id === reminderId);
            if (reminder) {
                const reminderTime = new Date(reminder.dateTime).toLocaleString();
                console.log(`Custom reminder triggered: ${reminder.text} at ${reminderTime}`);
                logToDiscord(`Reminder Fired: "${reminder.text}" (Scheduled for: ${reminderTime})`, 'success');
                
                chrome.notifications.create(`customNotif-${reminder.id}-${Date.now()}`, {
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'Reminder!',
                    message: reminder.text,
                    priority: 2,
                });
                speakInBackground(`Reminder: ${reminder.text}`);
                removePastOrInvalidReminderFromStorage(reminder.id); 
            } else {
                console.warn("Fired alarm for a custom reminder not found in storage (might have been deleted):", alarm.name);
                logToDiscord(`Fired alarm for missing reminder ID: ${reminderId}`, 'warning');
            }
        });
    }
});

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scheduleCustomReminder" && request.reminder) {
        scheduleSpecificCustomReminder(request.reminder);
        sendResponse({ status: "Custom reminder scheduling processed by background." });
        return true; 
    } else if (request.action === "cancelCustomReminder" && request.reminderId) {
        chrome.storage.local.get({ customReminders: [] }, (result) => { 
            const reminderToCancel = result.customReminders.find(r => r.id === request.reminderId);
            const reminderTextLog = reminderToCancel ? `"${reminderToCancel.text}" (ID: ${request.reminderId})` : `ID: ${request.reminderId}`;
            logToDiscord(`Reminder cancellation requested from popup: ${reminderTextLog}`, 'info');
        });
        cancelSpecificCustomReminder(request.reminderId);
        removePastOrInvalidReminderFromStorage(request.reminderId); 
        sendResponse({ status: "Custom reminder cancellation processed by background." });
        return true; 
    }
    return false; 
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    console.log("Notification button clicked:", notificationId, buttonIndex);
    logToDiscord(`Notification button clicked: ID ${notificationId}, Button Index: ${buttonIndex}`, 'info');
});
