// background.js
// This file will handle alarms, notifications, and background tasks.

// --- Constants ---
const DAILY_GREETING_ALARM_NAME = 'dailyGreetingAlarm';
const BIRTHDAY_CHECK_ALARM_NAME = 'dailyBirthdayCheck';
const CUSTOM_REMINDER_ALARM_PREFIX = 'customReminderAlarm_'; 

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
async function removePastOrInvalidReminderFromStorage(reminderId) {
    try {
        const result = await new Promise(resolve => chrome.storage.local.get({ customReminders: [] }, resolve));
        const initialCount = result.customReminders.length;
        const updatedReminders = result.customReminders.filter(r => r.id !== reminderId);

        if (updatedReminders.length < initialCount) {
            await new Promise(resolve => chrome.storage.local.set({ customReminders: updatedReminders }, resolve));
            console.log(`Removed past/invalid reminder ID ${reminderId} from storage.`);
            // Inform popup to refresh its list
            chrome.runtime.sendMessage({ action: "refreshReminders" }).catch(e => console.log("Popup not open or error sending refresh message:", e.message || e));
            chrome.runtime.sendMessage({ action: "showActionFeedback", message: "A past/invalid reminder was cleared.", type: "info" }).catch(e => console.log("Popup not open for feedback:", e.message || e));
        }
    } catch (error) {
        console.error("Error removing reminder from storage:", error);
    }
}


function scheduleSpecificCustomReminder(reminder) {
    if (!reminder || !reminder.id || !reminder.dateTime || !reminder.text) {
        console.error("Invalid reminder object for scheduling:", reminder);
        if(reminder && reminder.id) removePastOrInvalidReminderFromStorage(reminder.id); // Clean up if possible
        return;
    }

    const scheduleTime = new Date(reminder.dateTime).getTime();
    const now = Date.now();

    // Check if the scheduled time is in the past (e.g. by more than a minute to allow for slight delays)
    if (scheduleTime <= (now - 60000)) { // Allow a 1-minute grace for very near past due to processing
        console.log(`Reminder time for "${reminder.text}" (ID: ${reminder.id}) at ${new Date(reminder.dateTime).toLocaleString()} is in the past. Not scheduling.`);
        chrome.alarms.clear(CUSTOM_REMINDER_ALARM_PREFIX + reminder.id); // Ensure any old alarm is cleared
        removePastOrInvalidReminderFromStorage(reminder.id); // Remove it from storage
        return;
    }

    chrome.alarms.create(CUSTOM_REMINDER_ALARM_PREFIX + reminder.id, {
        when: scheduleTime
    });
    console.log(`Custom reminder "${reminder.text}" (ID: ${reminder.id}) scheduled for: ${new Date(scheduleTime).toLocaleString()} with alarm name: ${CUSTOM_REMINDER_ALARM_PREFIX + reminder.id}`);
}

function cancelSpecificCustomReminder(reminderId) {
    const alarmName = CUSTOM_REMINDER_ALARM_PREFIX + reminderId;
    chrome.alarms.clear(alarmName, (wasCleared) => {
        if (wasCleared) {
            console.log(`Cancelled alarm: ${alarmName}`);
        } else {
            // It's possible the alarm already fired and was cleared, or was never set due to being in the past.
            console.log(`No alarm found to cancel (or already cleared) with name: ${alarmName}`);
        }
    });
}

async function rescheduleAllCustomReminders() {
    try {
        const result = await new Promise(resolve => chrome.storage.local.get({ customReminders: [] }, resolve));
        let remindersToKeep = [];
        let madeChanges = false;

        if (result.customReminders && result.customReminders.length > 0) {
            for (const reminder of result.customReminders) {
                if (reminder.dateTime) {
                    const reminderTimeMs = new Date(reminder.dateTime).getTime();
                    if (reminderTimeMs > (Date.now() - 60000)) { // Check if it's in the future (with 1 min grace)
                        scheduleSpecificCustomReminder(reminder); // This function already checks if it's past
                        remindersToKeep.push(reminder); // Keep it if scheduled or still future
                    } else {
                        console.log(`During reschedule: Reminder "${reminder.text}" (ID: ${reminder.id}) at ${new Date(reminder.dateTime).toLocaleString()} is past. Clearing.`);
                        cancelSpecificCustomReminder(reminder.id); // Ensure alarm is cleared
                        madeChanges = true; // Mark that we are removing this reminder
                    }
                } else {
                     console.warn(`During reschedule: Reminder (ID: ${reminder.id}) missing dateTime. Removing.`);
                     cancelSpecificCustomReminder(reminder.id);
                     madeChanges = true;
                }
            }
        }
        
        // If any past reminders were identified and not kept by the loop, update storage.
        // Note: scheduleSpecificCustomReminder also calls removePastOrInvalidReminderFromStorage if it finds one is past.
        // This ensures consistency. If scheduleSpecificCustomReminder already removed it, this set will be harmless.
        // However, for items that were simply past and not processed by scheduleSpecific (e.g., missing dateTime), this explicit set is good.
        if (madeChanges && result.customReminders.length !== remindersToKeep.length) {
           await new Promise(resolve => chrome.storage.local.set({ customReminders: remindersToKeep }, resolve));
           console.log("Storage updated after rescheduling, removed past/invalid reminders.");
           chrome.runtime.sendMessage({ action: "refreshReminders" }).catch(e => console.log("Popup not open or error sending refresh message:", e.message || e));
        } else if (madeChanges) {
            // This case might happen if scheduleSpecificCustomReminder did the removal via removePastOrInvalidReminderFromStorage.
            // The list 'remindersToKeep' would be accurate if we didn't re-add ones scheduleSpecific already cleared.
            // To simplify, let's rely on scheduleSpecificCustomReminder to do the immediate removal and storage update.
            // The primary goal of rescheduleAll is to attempt scheduling for all supposedly future items.
            // The check inside scheduleSpecificCustomReminder will handle those that turn out to be past.
        }


    } catch (error) {
        console.error("Error in rescheduleAllCustomReminders:", error);
    }
}


// --- Event Listeners ---
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed or updated:', details.reason);
    scheduleDailyGreetingAlarm();
    scheduleBirthdayCheckAlarm();
    rescheduleAllCustomReminders(); 

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
    rescheduleAllCustomReminders(); 
});

chrome.alarms.onAlarm.addListener((alarm) => {
    console.log('Alarm triggered:', alarm.name);

    if (alarm.name === DAILY_GREETING_ALARM_NAME) {
        // ... (greeting logic remains the same)
        const today = new Date();
        const dayOfWeek = today.getDay(); 
        if (dayOfWeek >= 1 && dayOfWeek <= 5) { 
            chrome.storage.local.get({ userProfile: null }, (result) => {
                if (result.userProfile && result.userProfile.name) {
                    const greetingMessage = `Hey ${result.userProfile.name}, Good morning! Have a great day.`;
                    speakInBackground(greetingMessage); 
                }
            });
        }
    } else if (alarm.name === BIRTHDAY_CHECK_ALARM_NAME) {
        // ... (birthday logic remains the same)
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
                console.log(`Custom reminder triggered: ${reminder.text} at ${new Date(reminder.dateTime).toLocaleString()}`);
                chrome.notifications.create(`customNotif-${reminder.id}-${Date.now()}`, {
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'Reminder!',
                    message: reminder.text,
                    priority: 2,
                });
                speakInBackground(`Reminder: ${reminder.text}`);

                // Remove the one-time reminder from storage after it has fired
                removePastOrInvalidReminderFromStorage(reminder.id); // This also informs the popup
            } else {
                console.warn("Fired alarm for a custom reminder that was not found in storage (might have been deleted):", alarm.name);
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
        cancelSpecificCustomReminder(request.reminderId);
        // Also remove from storage if it hasn't fired yet
        removePastOrInvalidReminderFromStorage(request.reminderId);
        sendResponse({ status: "Custom reminder cancellation processed by background." });
        return true; 
    }
    // No async response for other message types from this listener if not handled
    return false; 
});

// Handle notification button click 
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    console.log("Notification button clicked:", notificationId, buttonIndex);
});
