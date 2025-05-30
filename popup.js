// popup.js

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Setup & General
    const setupSection = document.getElementById('setupSection');
    const mainAppSection = document.getElementById('mainAppSection');
    const setupForm = document.getElementById('setupForm');
    const userNameInput = document.getElementById('userName');
    const userEmailInput = document.getElementById('userEmail');
    const userDOBInput = document.getElementById('userDOB');
    const greetingElement = document.getElementById('greeting');
    const logoutButton = document.getElementById('logoutButton');

    // DOM Elements - To-Do List
    const todoInput = document.getElementById('todoInput');
    const addTodoButton = document.getElementById('addTodoButton');
    const todoListElement = document.getElementById('todoList');
    const clearAllTodosButton = document.getElementById('clearAllTodosButton');

    // DOM Elements - New Custom Reminder
    const newReminderForm = document.getElementById('newReminderForm');
    const reminderTextInput = document.getElementById('reminderText');
    const reminderTimeInput = document.getElementById('reminderTime');
    // const reminderDateInput = document.getElementById('reminderDate'); // If we add date later

    // DOM Elements - Upcoming Reminders
    const upcomingRemindersCard = document.getElementById('upcomingRemindersCard');
    const upcomingRemindersList = document.getElementById('upcomingRemindersList');

    // DOM Elements - Settings
    const voiceSelect = document.getElementById('voiceSelect');
    const enableVoiceGreeting = document.getElementById('enableVoiceGreeting');
    const enableSpokenReminders = document.getElementById('enableSpokenReminders');
    const updateVoiceSettingsButton = document.getElementById('updateVoiceSettingsButton');
    const settingsStatus = document.getElementById('settingsStatus'); 

    // DOM Elements - Banners & Feedback
    const bottomTodoBanner = document.getElementById('bottomTodoBanner'); // Renamed
    const bottomTodoBannerText = document.getElementById('bottomTodoBannerText'); // Renamed
    const dismissBottomTodoBannerBtn = document.getElementById('dismissBottomTodoBannerBtn');
    const actionFeedbackPopup = document.getElementById('actionFeedbackPopup');
    const actionFeedbackText = document.getElementById('actionFeedbackText');
    
    let feedbackTimeout = null; 
    let ttsVoices = []; 

    // --- Utility Functions for Feedback ---
    function showActionFeedback(message, type = 'success', duration = 3000) {
        if (!actionFeedbackPopup || !actionFeedbackText) return;
        actionFeedbackText.textContent = message;
        actionFeedbackPopup.className = 'action-feedback-popup'; 
        if (type === 'success') actionFeedbackPopup.classList.add('success');
        else if (type === 'error') actionFeedbackPopup.classList.add('error');
        actionFeedbackPopup.classList.add('show');
        if (feedbackTimeout) clearTimeout(feedbackTimeout);
        if (duration > 0) {
            feedbackTimeout = setTimeout(() => actionFeedbackPopup.classList.remove('show'), duration);
        }
    }
    
    function showSettingsStatus(message, type = 'success', duration = 3000) {
        if (!settingsStatus) return;
        settingsStatus.textContent = message;
        settingsStatus.className = 'status-text-small';
         if (type === 'success') settingsStatus.classList.add('status-success');
        else if (type === 'error') settingsStatus.classList.add('status-error');
        if (duration > 0) {
            setTimeout(() => {
                settingsStatus.textContent = '';
                settingsStatus.className = 'status-text-small';
            }, duration);
        }
    }

    // --- Bottom To-Do Banner Logic ---
    function updateBottomTodoBanner(todos = []) {
        if (!bottomTodoBanner || !bottomTodoBannerText) return; 
        const activeTodos = todos.filter(todo => !todo.completed);
        if (activeTodos.length > 0) {
            bottomTodoBannerText.textContent = `You have ${activeTodos.length} task(s) in your to-do list.`;
            bottomTodoBanner.classList.remove('hidden');
        } else {
            bottomTodoBanner.classList.add('hidden');
        }
    }

    if (dismissBottomTodoBannerBtn) {
        dismissBottomTodoBannerBtn.addEventListener('click', () => {
            if (bottomTodoBanner) bottomTodoBanner.classList.add('hidden');
        });
    }

    // --- Speech Synthesis (TTS) Setup ---
    function populateVoiceList() {
        if (typeof speechSynthesis === 'undefined') {
            showSettingsStatus('Speech synthesis not supported.', 'error');
            [voiceSelect, updateVoiceSettingsButton, enableVoiceGreeting, enableSpokenReminders].forEach(el => el.disabled = true);
            return;
        }
        const loadVoices = () => {
            ttsVoices = speechSynthesis.getVoices();
            voiceSelect.innerHTML = ''; 
            if (ttsVoices.length === 0) {
                const defaultOption = document.createElement('option');
                defaultOption.textContent = 'No voices available';
                voiceSelect.appendChild(defaultOption);
                voiceSelect.disabled = true;
                return;
            }
            voiceSelect.disabled = false;
            const defaultSystemOption = document.createElement('option');
            defaultSystemOption.textContent = 'System Default Voice';
            defaultSystemOption.value = ''; 
            voiceSelect.appendChild(defaultSystemOption);
            ttsVoices.forEach(voice => {
                const option = document.createElement('option');
                option.textContent = `${voice.name} (${voice.lang})`;
                option.value = voice.name; 
                voiceSelect.appendChild(option);
            });
            chrome.storage.local.get(['voiceName', 'voiceGreetingEnabled', 'spokenRemindersEnabled'], (result) => {
                voiceSelect.value = result.voiceName || ''; 
                enableVoiceGreeting.checked = result.voiceGreetingEnabled !== undefined ? result.voiceGreetingEnabled : false;
                enableSpokenReminders.checked = result.spokenRemindersEnabled !== undefined ? result.spokenRemindersEnabled : true;
            });
        };
        ttsVoices = speechSynthesis.getVoices();
        if (ttsVoices.length > 0) loadVoices();
        else speechSynthesis.onvoiceschanged = loadVoices;
    }

    function speak(text, onEndCallback = null) {
        chrome.storage.local.get(['voiceName', 'voiceGreetingEnabled', 'spokenRemindersEnabled'], (settings) => {
            const lowerText = text.toLowerCase();
            if (lowerText.startsWith("hey ") && !settings.voiceGreetingEnabled) { // Greetings
                if (onEndCallback) onEndCallback(); return;
            }
            // For custom reminders and other action feedback from popup
            if (lowerText.startsWith("reminder set:") && !settings.spokenRemindersEnabled) {
                 if (onEndCallback) onEndCallback(); return;
            }
            // General spoken feedback from popup actions (add task, delete task etc.)
            // This assumes these should also respect 'spokenRemindersEnabled' for now.
            // If you want *all* popup action feedback spoken regardless, this condition needs adjustment.
            const popupActionKeywords = ["task added", "task deleted", "all tasks cleared", "task marked as done", "task marked as active"];
            if (popupActionKeywords.some(keyword => lowerText.includes(keyword)) && !settings.spokenRemindersEnabled) {
                if (onEndCallback) onEndCallback(); return;
            }

            if (typeof speechSynthesis === 'undefined' || speechSynthesis.speaking) {
                if (speechSynthesis.speaking) console.warn("Speech synthesis is busy.");
                if (onEndCallback) onEndCallback(); return;
            }
            const utterance = new SpeechSynthesisUtterance(text);
            if (settings.voiceName && ttsVoices.length > 0) { 
                const selectedVoice = ttsVoices.find(v => v.name === settings.voiceName);
                if (selectedVoice) utterance.voice = selectedVoice;
            }
            utterance.onend = () => { if (onEndCallback) onEndCallback(); };
            utterance.onerror = (event) => {
                console.error('SpeechSynthesisUtterance.onerror:', event);
                showSettingsStatus(`Speech error: ${event.error}`, 'error');
                if (onEndCallback) onEndCallback();
            };
            try { speechSynthesis.speak(utterance); } 
            catch (error) {
                console.error("Error speaking:", error);
                showSettingsStatus("Could not initiate speech.", "error");
                if (onEndCallback) onEndCallback();
            }
        });
    }

    // --- Initial User Setup Logic ---
    setupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = userNameInput.value.trim();
        if (!name) { showActionFeedback('Name is required.', 'error'); return; }
        const userData = { name: name, email: userEmailInput.value.trim(), dob: userDOBInput.value };
        chrome.storage.local.set({ userProfile: userData, setupComplete: true }, () => {
            showActionFeedback('Settings saved successfully!', 'success');
            checkSetupState(); 
            greetUser(userData.name); 
        });
    });

    logoutButton.addEventListener('click', () => {
        if (confirm("Are you sure you want to reset your setup? All to-dos and reminders will be cleared.")) {
            chrome.storage.local.remove(
                ['userProfile', 'setupComplete', 'todos', 'customReminders', 'voiceName', 'voiceGreetingEnabled', 'spokenRemindersEnabled'], 
                () => {
                    showActionFeedback('Setup reset. Please configure again.', 'success');
                    checkSetupState();
                    todoListElement.innerHTML = ''; 
                    upcomingRemindersList.innerHTML = '<p class="info-text centered-text">No upcoming reminders set.</p>';
                    userNameInput.value = ''; userEmailInput.value = ''; userDOBInput.value = '';
                    populateVoiceList(); 
                    updateBottomTodoBanner([]); 
                    upcomingRemindersCard.classList.add('hidden');
                }
            );
        }
    });

    // --- General To-Do Management Logic ---
    function renderTodos(todos = []) {
        todoListElement.innerHTML = ''; 
        if (todos.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.textContent = 'No tasks yet. Add some to your list!';
            emptyMsg.className = 'info-text centered-text'; 
            todoListElement.appendChild(emptyMsg);
            clearAllTodosButton.classList.add('hidden'); 
        } else {
            clearAllTodosButton.classList.remove('hidden'); 
            todos.forEach((todo, index) => {
                const todoItem = document.createElement('div');
                todoItem.className = `todo-item ${todo.completed ? 'completed' : ''}`;
                const todoText = document.createElement('span');
                todoText.textContent = todo.text;
                todoText.className = 'todo-text';
                const actionsWrapper = document.createElement('div');
                actionsWrapper.className = 'todo-item-actions';
                const completeButton = document.createElement('button');
                completeButton.className = `complete-btn ${todo.completed ? 'completed' : ''}`;
                completeButton.innerHTML = todo.completed ?
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clip-rule="evenodd" /></svg>' : 
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" /></svg>'; 
                completeButton.title = todo.completed ? "Mark as Incomplete" : "Mark as Complete";
                completeButton.onclick = () => toggleTodoComplete(index);
                const deleteButton = document.createElement('button');
                deleteButton.className = 'delete-btn';
                deleteButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.177-2.365.298a.75.75 0 0 0-.53.904l.523 4.386A3.75 3.75 0 0 0 7.48 12.5H12.52a3.75 3.75 0 0 0 3.352-2.912l.523-4.386a.75.75 0 0 0-.53-.904c-.785-.12-1.57-.221-2.365-.298v-.443A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" /></svg>'; 
                deleteButton.title = "Delete To-Do";
                deleteButton.onclick = () => deleteTodo(index);
                actionsWrapper.appendChild(completeButton);
                actionsWrapper.appendChild(deleteButton);
                todoItem.appendChild(todoText);
                todoItem.appendChild(actionsWrapper);
                todoListElement.appendChild(todoItem);
            });
        }
        updateBottomTodoBanner(todos); 
    }

    function addTodo() {
        const text = todoInput.value.trim();
        if (!text) { showActionFeedback('To-do task cannot be empty.', 'error'); return; }
        chrome.storage.local.get({ todos: [] }, (result) => {
            const newTodos = [...result.todos, { text: text, completed: false, id: Date.now() }];
            chrome.storage.local.set({ todos: newTodos }, () => {
                renderTodos(newTodos);
                todoInput.value = ''; 
                showActionFeedback('Task added to your to-do list!', 'success');
                speak("Task added"); 
            });
        });
    }
    addTodoButton.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTodo(); });

    function deleteTodo(index) {
        chrome.storage.local.get({ todos: [] }, (result) => {
            const itemText = result.todos[index].text;
            if (confirm(`Are you sure you want to delete the task: "${itemText}"?`)) {
                const newTodos = result.todos.filter((_, i) => i !== index);
                chrome.storage.local.set({ todos: newTodos }, () => {
                    renderTodos(newTodos);
                    showActionFeedback('Task deleted.', 'success');
                    speak("Task deleted");
                });
            }
        });
    }

    function toggleTodoComplete(index) {
        chrome.storage.local.get({ todos: [] }, (result) => {
            const newTodos = result.todos.map((todo, i) => 
                (i === index) ? { ...todo, completed: !todo.completed } : todo
            );
            chrome.storage.local.set({ todos: newTodos }, () => {
                renderTodos(newTodos);
                const isCompleted = newTodos[index].completed;
                const feedbackMessage = isCompleted ? "Task marked as done!" : "Task marked as active.";
                showActionFeedback(feedbackMessage, 'success');
                speak(isCompleted ? "Task done" : "Task active");
            });
        });
    }

    clearAllTodosButton.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear all tasks from your to-do list?")) {
            chrome.storage.local.set({ todos: [] }, () => {
                renderTodos([]);
                showActionFeedback('All tasks cleared.', 'success');
                speak("All tasks cleared");
            });
        }
    });

    // --- Custom Timed Reminder Logic ---
    function renderUpcomingReminders(reminders = []) {
        upcomingRemindersList.innerHTML = '';
        if (reminders.length === 0) {
            upcomingRemindersList.innerHTML = '<p class="info-text centered-text">No upcoming reminders set.</p>';
            upcomingRemindersCard.classList.add('hidden');
            return;
        }
        upcomingRemindersCard.classList.remove('hidden');
        
        // Sort reminders by time for display (optional, but good UX)
        reminders.sort((a, b) => {
            const timeA = new Date(`1970-01-01T${a.time}`);
            const timeB = new Date(`1970-01-01T${b.time}`);
            return timeA - timeB;
        });

        reminders.forEach((reminder, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'reminder-item'; // Using a similar class to to-do for now

            const textPart = document.createElement('span');
            textPart.className = 'reminder-text-main';
            textPart.textContent = reminder.text;

            const timeBadge = document.createElement('span');
            timeBadge.className = 'reminder-time-badge';
            // Format time for display (e.g., 09:30 AM)
            const [hours, minutes] = reminder.time.split(':');
            const d = new Date();
            d.setHours(parseInt(hours, 10));
            d.setMinutes(parseInt(minutes, 10));
            timeBadge.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const actionsWrapper = document.createElement('div');
            actionsWrapper.className = 'reminder-item-actions';
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.177-2.365.298a.75.75 0 0 0-.53.904l.523 4.386A3.75 3.75 0 0 0 7.48 12.5H12.52a3.75 3.75 0 0 0 3.352-2.912l.523-4.386a.75.75 0 0 0-.53-.904c-.785-.12-1.57-.221-2.365-.298v-.443A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" /></svg>';
            deleteBtn.title = "Delete Reminder";
            deleteBtn.onclick = () => deleteCustomReminder(index);
            
            actionsWrapper.appendChild(deleteBtn);
            itemEl.appendChild(textPart);
            itemEl.appendChild(timeBadge);
            itemEl.appendChild(actionsWrapper);
            upcomingRemindersList.appendChild(itemEl);
        });
    }
    
    newReminderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = reminderTextInput.value.trim();
        const time = reminderTimeInput.value; // Format HH:MM

        if (!text || !time) {
            showActionFeedback('Reminder text and time are required.', 'error');
            return;
        }

        // Basic time validation (ensure it's not in the past for today)
        const [hours, minutes] = time.split(':');
        const reminderDateTime = new Date();
        reminderDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

        if (reminderDateTime < new Date()) {
            showActionFeedback('Cannot set a reminder for a past time today.', 'error');
            return;
        }

        const newReminder = {
            id: `custom-${Date.now()}`, // Unique ID for the reminder
            text: text,
            time: time, // Store as HH:MM string
            // date: reminderDateInput.value || null, // If date input is added
            createdAt: new Date().toISOString()
        };

        chrome.storage.local.get({ customReminders: [] }, (result) => {
            const updatedReminders = [...result.customReminders, newReminder];
            chrome.storage.local.set({ customReminders: updatedReminders }, () => {
                showActionFeedback(`Reminder set for ${new Date('1970-01-01T' + time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}!`, 'success');
                speak(`Reminder set for ${text}`);
                renderUpcomingReminders(updatedReminders);
                newReminderForm.reset(); // Clear the form
                // Send message to background to set the actual alarm
                chrome.runtime.sendMessage({ action: "scheduleCustomReminder", reminder: newReminder }, response => {
                    if (chrome.runtime.lastError) {
                        console.error("Error sending message to background:", chrome.runtime.lastError.message);
                        showActionFeedback('Error scheduling reminder alarm.', 'error');
                    } else if (response && response.status) {
                        console.log("Background response for scheduleCustomReminder:", response.status);
                    }
                });
            });
        });
    });

    function deleteCustomReminder(indexToDelete) {
         chrome.storage.local.get({ customReminders: [] }, (result) => {
            const reminderToDelete = result.customReminders[indexToDelete];
            if (!reminderToDelete) return;

            if (confirm(`Are you sure you want to delete the reminder: "${reminderToDelete.text}"?`)) {
                const updatedReminders = result.customReminders.filter((_, index) => index !== indexToDelete);
                chrome.storage.local.set({ customReminders: updatedReminders }, () => {
                    renderUpcomingReminders(updatedReminders);
                    showActionFeedback('Reminder deleted.', 'success');
                    speak("Reminder deleted");
                    // Send message to background to cancel the alarm
                    chrome.runtime.sendMessage({ action: "cancelCustomReminder", reminderId: reminderToDelete.id }, response => {
                         if (chrome.runtime.lastError) {
                            console.error("Error sending message to background for cancel:", chrome.runtime.lastError.message);
                        } else if (response && response.status) {
                            console.log("Background response for cancelCustomReminder:", response.status);
                        }
                    });
                });
            }
        });
    }


    // --- Greeting Logic ---
    function greetUser(name) {
        const hour = new Date().getHours();
        let timeOfDayGreeting = "Good day";
        if (hour < 12) timeOfDayGreeting = "Good morning";
        else if (hour < 18) timeOfDayGreeting = "Good afternoon";
        else timeOfDayGreeting = "Good evening";
        const greetingText = `Hey ${name}, ${timeOfDayGreeting}!`;
        greetingElement.textContent = greetingText;
        speak(greetingText); 
    }

    // --- Voice Settings ---
    updateVoiceSettingsButton.addEventListener('click', () => {
        const selectedVoiceName = voiceSelect.value; 
        const greetingEnabled = enableVoiceGreeting.checked;
        const remindersEnabled = enableSpokenReminders.checked;
        chrome.storage.local.set({
            voiceName: selectedVoiceName,
            voiceGreetingEnabled: greetingEnabled,
            spokenRemindersEnabled: remindersEnabled
        }, () => {
            showSettingsStatus('Voice settings updated!', 'success');
            speak("Voice settings updated");
        });
    });

    // --- Application State Management ---
    function checkSetupState() {
        chrome.storage.local.get(['setupComplete', 'userProfile', 'todos', 'customReminders'], (result) => {
            if (result.setupComplete && result.userProfile && result.userProfile.name) {
                setupSection.classList.add('hidden');
                mainAppSection.classList.remove('hidden');
                greetUser(result.userProfile.name);
                renderTodos(result.todos || []);
                renderUpcomingReminders(result.customReminders || []);
            } else {
                setupSection.classList.remove('hidden');
                mainAppSection.classList.add('hidden');
                updateBottomTodoBanner([]); 
                upcomingRemindersCard.classList.add('hidden');
            }
        });
    }

    // --- Initialization ---
    populateVoiceList(); 
    checkSetupState();   
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "speak") { // For popup to speak messages from background (e.g., birthday)
        speak(request.text);
        sendResponse({status: "Popup speaking or queued"});
    } else if (request.action === "refreshReminders") { // If background modifies reminders (e.g. clears past ones)
        chrome.storage.local.get({ customReminders: [] }, (result) => {
            renderUpcomingReminders(result.customReminders);
        });
        sendResponse({status: "Popup reminders refreshed"});
    }
    return true; 
});
