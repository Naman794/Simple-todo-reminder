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

    // DOM Elements - Home Screen Navigation
    const homeScreenNav = document.getElementById('homeScreenNav');
    const navToTodos = document.getElementById('navToTodos');
    const navToSetReminder = document.getElementById('navToSetReminder');
    const navToUpcomingReminders = document.getElementById('navToUpcomingReminders');
    const navToYouTubeStats = document.getElementById('navToYouTubeStats');
    const navToSettings = document.getElementById('navToSettings');

    // DOM Elements - Feature Sections/Cards
    const todoCard = document.getElementById('todoCard');
    const newReminderCard = document.getElementById('newReminderCard');
    const upcomingRemindersCard = document.getElementById('upcomingRemindersCard');
    const youtubeStatsCard = document.getElementById('youtubeStatsCard');
    const settingsSection = document.getElementById('settingsSection'); 

    const allFeatureSections = [todoCard, newReminderCard, upcomingRemindersCard, youtubeStatsCard, settingsSection];

    // DOM Elements - To-Do List
    const todoInput = document.getElementById('todoInput');
    const addTodoButton = document.getElementById('addTodoButton');
    const todoListElement = document.getElementById('todoList');
    const clearAllTodosButton = document.getElementById('clearAllTodosButton');

    // DOM Elements - New Custom Reminder
    const newReminderForm = document.getElementById('newReminderForm');
    const reminderTextInput = document.getElementById('reminderText');
    const reminderDateInput = document.getElementById('reminderDate'); // New date input
    const reminderTimeInput = document.getElementById('reminderTime');

    // DOM Elements - Upcoming Reminders
    const upcomingRemindersList = document.getElementById('upcomingRemindersList');

    // DOM Elements - YouTube Stats
    const fetchYouTubeStatsButton = document.getElementById('fetchYouTubeStatsButton');
    const youtubeStatsDisplay = document.getElementById('youtubeStatsDisplay');
    const ytStatsMessage = document.getElementById('ytStatsMessage');
    const configureApiKeyButton = document.getElementById('configureApiKeyButton');
    const apiKeyInputSection = document.getElementById('apiKeyInputSection');
    const youtubeApiKeyInput = document.getElementById('youtubeApiKey');
    const saveApiKeyButton = document.getElementById('saveApiKeyButton');
    
    // DOM Elements - Settings
    const voiceSelect = document.getElementById('voiceSelect');
    const enableVoiceGreeting = document.getElementById('enableVoiceGreeting');
    const enableSpokenReminders = document.getElementById('enableSpokenReminders');
    const updateVoiceSettingsButton = document.getElementById('updateVoiceSettingsButton');
    const settingsStatus = document.getElementById('settingsStatus'); 

    // DOM Elements - Banners & Feedback
    const bottomTodoBanner = document.getElementById('bottomTodoBanner'); 
    const bottomTodoBannerText = document.getElementById('bottomTodoBannerText'); 
    const dismissBottomTodoBannerBtn = document.getElementById('dismissBottomTodoBannerBtn');
    const actionFeedbackPopup = document.getElementById('actionFeedbackPopup');
    const actionFeedbackText = document.getElementById('actionFeedbackText');
    
    let feedbackTimeout = null; 
    let ttsVoices = []; 
    const YOUTUBE_API_KEY_STORAGE_KEY = 'youtubeApiKey';
    let YOUTUBE_API_KEY = ''; 

    // --- Navigation Logic ---
    function showView(viewToShow) {
        if(homeScreenNav) homeScreenNav.classList.add('hidden');
        allFeatureSections.forEach(section => {
            if(section) section.classList.add('hidden');
        });
        if (viewToShow) {
            viewToShow.classList.remove('hidden');
        } else { 
             if (mainAppSection && !mainAppSection.classList.contains('hidden') && homeScreenNav) {
                homeScreenNav.classList.remove('hidden');
            }
        }
    }

    if (navToTodos) navToTodos.addEventListener('click', () => showView(todoCard));
    if (navToSetReminder) navToSetReminder.addEventListener('click', () => showView(newReminderCard));
    if (navToUpcomingReminders) {
        navToUpcomingReminders.addEventListener('click', () => {
            showView(upcomingRemindersCard);
            chrome.storage.local.get({ customReminders: [] }, (result) => {
                renderUpcomingReminders(result.customReminders || []);
            });
        });
    }
    if (navToYouTubeStats) navToYouTubeStats.addEventListener('click', () => showView(youtubeStatsCard));
    if (navToSettings) navToSettings.addEventListener('click', () => showView(settingsSection));

    document.querySelectorAll('.btn-back').forEach(button => {
        button.addEventListener('click', (e) => {
            const targetViewId = e.currentTarget.dataset.targetView;
            if (targetViewId === "homeScreenNav" && homeScreenNav) {
                showView(homeScreenNav);
            } else {
                const targetElement = document.getElementById(targetViewId);
                if (targetElement) showView(targetElement);
                else if (homeScreenNav) showView(homeScreenNav); 
            }
        });
    });

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
            [voiceSelect, updateVoiceSettingsButton, enableVoiceGreeting, enableSpokenReminders].forEach(el => { if(el) el.disabled = true; });
            return;
        }
        const loadVoices = () => {
            ttsVoices = speechSynthesis.getVoices();
            if(voiceSelect) voiceSelect.innerHTML = ''; 
            else return;

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
                if(enableVoiceGreeting) enableVoiceGreeting.checked = result.voiceGreetingEnabled !== undefined ? result.voiceGreetingEnabled : false;
                if(enableSpokenReminders) enableSpokenReminders.checked = result.spokenRemindersEnabled !== undefined ? result.spokenRemindersEnabled : true;
            });
        };
        ttsVoices = speechSynthesis.getVoices();
        if (ttsVoices.length > 0) loadVoices();
        else speechSynthesis.onvoiceschanged = loadVoices;
    }

    function speak(text, onEndCallback = null) {
        chrome.storage.local.get(['voiceName', 'voiceGreetingEnabled', 'spokenRemindersEnabled'], (settings) => {
            const lowerText = text.toLowerCase();
            if (lowerText.startsWith("hey ") && !settings.voiceGreetingEnabled) { 
                if (onEndCallback) onEndCallback(); return;
            }
            if (lowerText.startsWith("reminder:") && !settings.spokenRemindersEnabled) {
                 if (onEndCallback) onEndCallback(); return;
            }
            const popupActionKeywords = ["task added", "task deleted", "all tasks cleared", "task marked as done", "task marked as active", "reminder set for", "settings saved", "setup reset", "voice settings updated"];
            if (popupActionKeywords.some(keyword => lowerText.includes(keyword)) && !settings.spokenRemindersEnabled && !lowerText.startsWith("reminder set for")) { // Allow "reminder set for" to bypass this specific check
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
    if(setupForm) setupForm.addEventListener('submit', (e) => {
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

    // --- Logout Button ---
    if(logoutButton) logoutButton.addEventListener('click', () => {
        if (confirm("Are you sure you want to reset your setup? All data will be cleared.")) {
            chrome.storage.local.remove(
                ['userProfile', 'setupComplete', 'todos', 'customReminders', 'voiceName', 'voiceGreetingEnabled', 'spokenRemindersEnabled', YOUTUBE_API_KEY_STORAGE_KEY], 
                () => {
                    showActionFeedback('Setup reset. Please configure again.', 'success');
                    YOUTUBE_API_KEY = ''; 
                    if(youtubeApiKeyInput) youtubeApiKeyInput.value = '';
                    if(apiKeyInputSection) apiKeyInputSection.classList.add('hidden');
                    checkSetupState(); 
                }
            );
        }
    });

    // --- General To-Do Management Logic ---
    function renderTodos(todos = []) {
        if (!todoListElement) return;
        todoListElement.innerHTML = ''; 
        if (!todos || todos.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.textContent = 'No tasks yet. Add some to your list!';
            emptyMsg.className = 'info-text centered-text'; 
            todoListElement.appendChild(emptyMsg);
            if(clearAllTodosButton) clearAllTodosButton.classList.add('hidden'); 
        } else {
            if(clearAllTodosButton) clearAllTodosButton.classList.remove('hidden'); 
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
    if(addTodoButton) addTodoButton.addEventListener('click', addTodo);
    if(todoInput) todoInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTodo(); });

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
    function clearAllTodos() {
        if (confirm("Are you sure you want to clear all tasks from your to-do list?")) {
            chrome.storage.local.set({ todos: [] }, () => {
                renderTodos([]);
                showActionFeedback('All tasks cleared.', 'success');
                speak("All tasks cleared");
            });
        }
    }
    if(clearAllTodosButton) clearAllTodosButton.addEventListener('click', clearAllTodos);


    // --- Custom Timed Reminder Logic ---
    function renderUpcomingReminders(reminders = []) {
        if(!upcomingRemindersList || !upcomingRemindersCard) return;
        upcomingRemindersList.innerHTML = '';
        if (!reminders || reminders.length === 0) {
            upcomingRemindersList.innerHTML = '<p class="info-text centered-text">No upcoming reminders set.</p>';
            upcomingRemindersCard.classList.add('hidden');
            return;
        }
        upcomingRemindersCard.classList.remove('hidden');
        
        reminders.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime)); // Sort by full dateTime

        reminders.forEach((reminder, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'reminder-item'; 

            const textPart = document.createElement('span');
            textPart.className = 'reminder-text-main';
            textPart.textContent = reminder.text;

            const dateTimeBadge = document.createElement('span');
            dateTimeBadge.className = 'reminder-time-badge';
            const d = new Date(reminder.dateTime);
            // Format: "May 31, 09:30 AM" or "Today, 09:30 AM" or "Tomorrow, 09:30 AM"
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);

            let dateDisplay = '';
            if (d.toDateString() === today.toDateString()) {
                dateDisplay = 'Today, ';
            } else if (d.toDateString() === tomorrow.toDateString()) {
                dateDisplay = 'Tomorrow, ';
            } else {
                dateDisplay = d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ';
            }
            dateTimeBadge.textContent = dateDisplay + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });


            const actionsWrapper = document.createElement('div');
            actionsWrapper.className = 'reminder-item-actions';
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.177-2.365.298a.75.75 0 0 0-.53.904l.523 4.386A3.75 3.75 0 0 0 7.48 12.5H12.52a3.75 3.75 0 0 0 3.352-2.912l.523-4.386a.75.75 0 0 0-.53-.904c-.785-.12-1.57-.221-2.365-.298v-.443A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" /></svg>';
            deleteBtn.title = "Delete Reminder";
            deleteBtn.onclick = () => deleteCustomReminder(index); // Pass original index before sort if needed, or use ID
            
            actionsWrapper.appendChild(deleteBtn);
            itemEl.appendChild(textPart);
            itemEl.appendChild(dateTimeBadge);
            itemEl.appendChild(actionsWrapper);
            upcomingRemindersList.appendChild(itemEl);
        });
    }
    
    function handleNewReminderSubmit(e) {
        e.preventDefault();
        const text = reminderTextInput.value.trim();
        const time = reminderTimeInput.value; 
        const dateStr = reminderDateInput.value; // YYYY-MM-DD

        if (!text || !time) {
            showActionFeedback('Reminder text and time are required.', 'error');
            return;
        }

        let reminderDateTime;
        const now = new Date();
        const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;


        if (dateStr) {
            reminderDateTime = new Date(`${dateStr}T${time}`);
        } else {
            // Default to today if no date is picked
            reminderDateTime = new Date(`${todayDateStr}T${time}`);
        }

        if (reminderDateTime <= now) {
            showActionFeedback('Reminder date/time must be in the future.', 'error');
            return;
        }

        const newReminder = {
            id: `custom-${Date.now()}`,
            text: text,
            time: time, 
            date: dateStr || todayDateStr, 
            dateTime: reminderDateTime.toISOString(), 
            createdAt: new Date().toISOString()
        };

        chrome.storage.local.get({ customReminders: [] }, (result) => {
            const updatedReminders = [...result.customReminders, newReminder];
            chrome.storage.local.set({ customReminders: updatedReminders }, () => {
                const formattedDateTime = reminderDateTime.toLocaleDateString([], {month: 'short', day: 'numeric'}) + ', ' + reminderDateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                showActionFeedback(`Reminder set for ${formattedDateTime}!`, 'success');
                speak(`Reminder set for ${text}`);
                renderUpcomingReminders(updatedReminders);
                newReminderForm.reset(); 
                chrome.runtime.sendMessage({ action: "scheduleCustomReminder", reminder: newReminder }, response => {
                    if (chrome.runtime.lastError) {
                        console.error("Error sending scheduleCustomReminder:", chrome.runtime.lastError.message);
                        showActionFeedback('Error scheduling alarm.', 'error');
                    } else if (response && response.status) {
                        console.log("Background response for scheduleCustomReminder:", response.status);
                    }
                });
            });
        });
    }
    if(newReminderForm) newReminderForm.addEventListener('submit', handleNewReminderSubmit);

    function deleteCustomReminder(indexToDelete) { // Consider using ID for deletion if sorting changes index
         chrome.storage.local.get({ customReminders: [] }, (result) => {
            // If using index after sorting, we need to find the original item by ID or a stable property
            // For now, assuming index is from the currently rendered (and sorted) list.
            // A more robust way is to pass the reminder.id to delete.
            // Let's assume for now the index corresponds to the sorted list and we refetch to be sure.
            let reminders = result.customReminders;
            reminders.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime)); // Ensure same sort as display
            
            const reminderToDelete = reminders[indexToDelete];
            if (!reminderToDelete) {
                console.error("Reminder to delete not found at index:", indexToDelete);
                return;
            }

            if (confirm(`Are you sure you want to delete the reminder: "${reminderToDelete.text}"?`)) {
                const updatedReminders = result.customReminders.filter(r => r.id !== reminderToDelete.id); // Delete by ID
                chrome.storage.local.set({ customReminders: updatedReminders }, () => {
                    renderUpcomingReminders(updatedReminders);
                    showActionFeedback('Reminder deleted.', 'success');
                    speak("Reminder deleted");
                    chrome.runtime.sendMessage({ action: "cancelCustomReminder", reminderId: reminderToDelete.id }, response => {
                         if (chrome.runtime.lastError) {
                            console.error("Error sending cancelCustomReminder:", chrome.runtime.lastError.message);
                        } else if (response && response.status) {
                            console.log("Background response for cancelCustomReminder:", response.status);
                        }
                    });
                });
            }
        });
    }

    // --- YouTube Stats Logic ---
    if(configureApiKeyButton) configureApiKeyButton.addEventListener('click', () => {
        if(apiKeyInputSection) apiKeyInputSection.classList.toggle('hidden');
    });
    if(saveApiKeyButton) saveApiKeyButton.addEventListener('click', () => {
        const key = youtubeApiKeyInput.value.trim();
        if (key) {
            chrome.storage.local.set({ [YOUTUBE_API_KEY_STORAGE_KEY]: key }, () => {
                YOUTUBE_API_KEY = key;
                showActionFeedback('API Key saved!', 'success');
                if(apiKeyInputSection) apiKeyInputSection.classList.add('hidden');
                if(youtubeApiKeyInput) youtubeApiKeyInput.value = ''; 
                 if(ytStatsMessage) ytStatsMessage.textContent = 'API Key configured. Navigate to a YouTube channel and click "Get Stats".';
                 if(youtubeStatsDisplay && ytStatsMessage) { // Clear previous stats/errors
                    youtubeStatsDisplay.innerHTML = ''; 
                    youtubeStatsDisplay.appendChild(ytStatsMessage);
                 }
            });
        } else {
            showActionFeedback('API Key cannot be empty.', 'error');
        }
    });
    function loadApiKey() {
        chrome.storage.local.get(YOUTUBE_API_KEY_STORAGE_KEY, (result) => {
            if (result[YOUTUBE_API_KEY_STORAGE_KEY]) {
                YOUTUBE_API_KEY = result[YOUTUBE_API_KEY_STORAGE_KEY];
                console.log("YouTube API Key loaded from storage.");
                 if(ytStatsMessage) ytStatsMessage.textContent = 'API Key loaded. Navigate to a YouTube channel and click "Get Stats".';
            } else {
                console.log("YouTube API Key not found in storage. Please configure.");
                if(ytStatsMessage) {
                    ytStatsMessage.textContent = 'YouTube API Key needed. Click "Configure" to set it.';
                    ytStatsMessage.classList.add('error-text');
                }
            }
        });
    }
    if(fetchYouTubeStatsButton) fetchYouTubeStatsButton.addEventListener('click', () => {
        if (!YOUTUBE_API_KEY) { /* ... error handling ... */ return; }
        if(youtubeStatsDisplay) youtubeStatsDisplay.innerHTML = `<p class="loading-text">Fetching channel ID...</p>`;
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => { /* ... rest of logic ... */ });
    });
    async function fetchChannelStats(channelId) { /* ... (Full implementation from previous version) ... */ }
    function formatNumber(numStr) { /* ... (Full implementation from previous version) ... */ }


    // --- Greeting Logic ---
    function greetUser(name) { 
        if(!greetingElement) return;
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
    if(updateVoiceSettingsButton) updateVoiceSettingsButton.addEventListener('click', () => {
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
        chrome.storage.local.get(['setupComplete', 'userProfile', 'todos', 'customReminders', YOUTUBE_API_KEY_STORAGE_KEY], (result) => {
            if (result.setupComplete && result.userProfile && result.userProfile.name) {
                if(setupSection) setupSection.classList.add('hidden');
                if(mainAppSection) mainAppSection.classList.remove('hidden');
                showView(homeScreenNav); 
                greetUser(result.userProfile.name);
                renderTodos(result.todos || []); 
                updateBottomTodoBanner(result.todos || []);
                // Upcoming reminders are rendered when navigating to their view.
                // Load API key here as well.
                if (result[YOUTUBE_API_KEY_STORAGE_KEY]) { 
                    YOUTUBE_API_KEY = result[YOUTUBE_API_KEY_STORAGE_KEY];
                    if(ytStatsMessage) ytStatsMessage.textContent = 'API Key loaded. Navigate to a YouTube channel and click "Get Stats".';
                } else {
                    if(ytStatsMessage) {
                        ytStatsMessage.textContent = 'YouTube API Key needed. Click "Configure" to set it.';
                        if(ytStatsMessage.classList) ytStatsMessage.classList.add('error-text');
                    }
                }
            } else { 
                if(setupSection) setupSection.classList.remove('hidden');
                if(mainAppSection) mainAppSection.classList.add('hidden');
                showView(null); 
                updateBottomTodoBanner([]); 
                if(upcomingRemindersCard) upcomingRemindersCard.classList.add('hidden');
                 if(ytStatsMessage) { 
                    ytStatsMessage.textContent = 'Please complete setup first.';
                    if(ytStatsMessage.classList) ytStatsMessage.classList.remove('error-text');
                }
            }
        });
    }

    // --- Initialization ---
    function initializeApp() {
        populateVoiceList(); 
        checkSetupState(); 
    }
    initializeApp();

    // --- Message Listener from Background ---
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "speak") { 
            speak(request.text);
            sendResponse({status: "Popup speaking or queued"});
        } else if (request.action === "refreshReminders") { 
            chrome.storage.local.get({ customReminders: [] }, (result) => {
                renderUpcomingReminders(result.customReminders);
            });
            sendResponse({status: "Popup reminders refreshed"});
        } else if (request.action === "showActionFeedback" && request.message) {
            showActionFeedback(request.message, request.type || 'success');
            sendResponse({status: "Feedback shown"});
        }
        return true; 
    });
});
