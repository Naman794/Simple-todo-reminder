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
    // const navToYouTubeStats = document.getElementById('navToYouTubeStats'); // Feature removed
    const navToSettings = document.getElementById('navToSettings');

    // DOM Elements - Feature Sections/Cards
    const todoCard = document.getElementById('todoCard');
    const newReminderCard = document.getElementById('newReminderCard');
    const upcomingRemindersCard = document.getElementById('upcomingRemindersCard');
    // const youtubeStatsCard = document.getElementById('youtubeStatsCard'); // Feature removed
    const settingsSection = document.getElementById('settingsSection'); 

    const allFeatureSections = [todoCard, newReminderCard, upcomingRemindersCard, /*youtubeStatsCard,*/ settingsSection].filter(Boolean);

    // DOM Elements - To-Do List
    const todoInput = document.getElementById('todoInput');
    const addTodoButton = document.getElementById('addTodoButton');
    const todoListElement = document.getElementById('todoList');
    const clearAllTodosButton = document.getElementById('clearAllTodosButton');

    // DOM Elements - New Custom Reminder
    const newReminderForm = document.getElementById('newReminderForm');
    const reminderTextInput = document.getElementById('reminderText');
    const reminderDateInput = document.getElementById('reminderDate'); 
    const reminderTimeInput = document.getElementById('reminderTime');

    // DOM Elements - Upcoming Reminders
    const upcomingRemindersList = document.getElementById('upcomingRemindersList');

    // DOM Elements - Settings
    const voiceSelect = document.getElementById('voiceSelect');
    const enableVoiceGreeting = document.getElementById('enableVoiceGreeting');
    const enableSpokenReminders = document.getElementById('enableSpokenReminders');
    const discordWebhookUrlInput = document.getElementById('discordWebhookUrlInput');
    const updateVoiceSettingsButton = document.getElementById('updateVoiceSettingsButton');
    const settingsStatus = document.getElementById('settingsStatus'); 

    // DOM Elements - Banners & Feedback
    const bottomTodoBanner = document.getElementById('bottomTodoBanner'); 
    const bottomTodoBannerText = document.getElementById('bottomTodoBannerText'); 
    const dismissBottomTodoBannerBtn = document.getElementById('dismissBottomTodoBannerBtn');
    // const actionFeedbackPopup = document.getElementById('actionFeedbackPopup'); // REMOVED
    // const actionFeedbackText = document.getElementById('actionFeedbackText');   // REMOVED

    const voiceGreetingWrapper = document.getElementById('voiceGreetingWrapper');
    const spokenReminderWrapper = document.getElementById('spokenReminderWrapper');

    // Toggle enableVoiceGreeting checkbox when the wrapper is clicked
    if (voiceGreetingWrapper && enableVoiceGreeting) {
        voiceGreetingWrapper.addEventListener('click', (e) => {
            if (e.target !== enableVoiceGreeting) {
                enableVoiceGreeting.checked = !enableVoiceGreeting.checked;
            }
        });
    }

    // Toggle enableSpokenReminders checkbox when the wrapper is clicked
    if (spokenReminderWrapper && enableSpokenReminders) {
        spokenReminderWrapper.addEventListener('click', (e) => {
            if (e.target !== enableSpokenReminders) {
                enableSpokenReminders.checked = !enableSpokenReminders.checked;
            }
        });
    }
    
    // let feedbackTimeout = null; // REMOVED for internal popup
    let ttsVoices = []; 
    // const YOUTUBE_API_KEY_STORAGE_KEY = 'youtubeApiKey'; // REMOVED
    // let YOUTUBE_API_KEY = ''; // REMOVED


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
    // YouTube Nav Button Removed
    if (navToSettings) navToSettings.addEventListener('click', () => {
        showView(settingsSection);
        chrome.storage.local.get(['discordWebhookUrl'], (result) => {
            if(discordWebhookUrlInput && result.discordWebhookUrl) {
                discordWebhookUrlInput.value = result.discordWebhookUrl;
            } else if (discordWebhookUrlInput) {
                discordWebhookUrlInput.value = ''; // Ensure it's clear if not set
            }
        });
    });


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
    function showActionFeedback(message, type = 'success') {
        // Send message to background to show an on-page toast
        // The duration parameter is removed as on-page toasts have their own fixed duration.
        chrome.runtime.sendMessage({
        action: "showOnPageToast",
        toastMessage: message,
        toastType: type
    }, (response) => {
        if (chrome.runtime.lastError) {
            const msg = chrome.runtime.lastError.message;
            if (msg.includes("The message port closed") || msg.includes("No receiving end") || msg.includes("Could not establish connection")) {
                console.log(`[Toast fallback - ${type}]: ${message}`);
            } else {
                console.warn("Unexpected toast message error:", msg);
            }
            return;
        }
        if (response?.status) {
                console.log(`[Action Feedback - ${type}]: ${message}`);
            }
        });
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
                if(voiceSelect) voiceSelect.value = result.voiceName || ''; 
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
            const popupActionKeywords = ["task added", "task deleted", "all tasks cleared", "task marked as done", "task marked as active", "reminder set for", "settings saved", "setup reset", "voice settings updated", "discord webhook url saved"]; // Added discord
            let isActionKeyword = popupActionKeywords.some(keyword => lowerText.includes(keyword));
            
            if (isActionKeyword && !lowerText.startsWith("reminder set for") && !settings.spokenRemindersEnabled) {
                if (onEndCallback) onEndCallback(); return;
            }
             if (lowerText.startsWith("reminder set for") && !settings.spokenRemindersEnabled){ 
                if(onEndCallback) onEndCallback(); return;
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
                ['userProfile', 'setupComplete', 'todos', 'customReminders', 'voiceName', 'voiceGreetingEnabled', 'spokenRemindersEnabled', 'discordWebhookUrl'], 
                () => {
                    showActionFeedback('Setup reset. Please configure again.', 'success');
                    if(discordWebhookUrlInput) discordWebhookUrlInput.value = ''; 
                    checkSetupState(); 
                }
            );
        }
    });

    // --- General To-Do Management Logic ---
    // (Full renderTodos, addTodo, deleteTodo, toggleTodoComplete, clearAllTodos functions as before, 
    // ensuring they call the new showActionFeedback for user messages)
    function renderTodos(todos = []) {
    if (!todoListElement) return;
    todoListElement.innerHTML = '';

    if (!todos || todos.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.textContent = 'No tasks yet. Add some to your list!';
        emptyMsg.className = 'info-text centered-text';
        todoListElement.appendChild(emptyMsg);
        if (clearAllTodosButton) clearAllTodosButton.classList.add('hidden');
    } else {
        if (clearAllTodosButton) clearAllTodosButton.classList.remove('hidden');

        todos.forEach((todo, index) => {
            const todoItem = document.createElement('div');
            todoItem.className = `todo-item ${todo.completed ? 'completed' : ''}`;

            const mainTaskArea = document.createElement('div');
            mainTaskArea.className = 'main-task-area';

            const todoText = document.createElement('span');
            todoText.textContent = todo.text;
            todoText.className = 'todo-text';

            const actionsWrapper = document.createElement('div');
            actionsWrapper.className = 'todo-item-actions';

            const completeButton = document.createElement('button');
            completeButton.className = `complete-btn ${todo.completed ? 'completed' : ''}`;
            completeButton.innerHTML = todo.completed
                ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clip-rule="evenodd" /></svg>'
                : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" /></svg>';

            completeButton.title = todo.completed ? "Mark as Incomplete" : "Mark as Complete";
            completeButton.onclick = () => toggleTodoComplete(index);

            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-btn';
            deleteButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.177-2.365.298a.75.75 0 0 0-.53.904l.523 4.386A3.75 3.75 0 0 0 7.48 12.5H12.52a3.75 3.75 0 0 0 3.352-2.912l.523-4.386a.75.75 0 0 0-.53-.904c-.785-.12-1.57-.221-2.365-.298v-.443A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" /></svg>';
            deleteButton.title = "Delete Task";
            deleteButton.onclick = () => deleteTodo(index);

            actionsWrapper.appendChild(completeButton);
            actionsWrapper.appendChild(deleteButton);

            mainTaskArea.appendChild(todoText);
            mainTaskArea.appendChild(actionsWrapper);
            todoItem.appendChild(mainTaskArea);

            // --- Subtasks Rendering Section ---
            const subtaskSection = document.createElement('div');
            subtaskSection.className = 'subtask-section';

            const subtaskList = document.createElement('div');
            subtaskList.className = 'subtask-list';

            (todo.subtasks || []).forEach((subtask, subIndex) => {
                const subtaskItem = document.createElement('div');
                subtaskItem.className = 'subtask-item';

                const subCheckbox = document.createElement('input');
                subCheckbox.type = 'checkbox';
                subCheckbox.className = 'subtask-checkbox';
                subCheckbox.checked = subtask.completed;
                subCheckbox.onchange = () => toggleSubtask(index, subIndex);

                const subText = document.createElement('span');
                subText.className = 'subtask-text';
                subText.textContent = subtask.text;

                const deleteSubBtn = document.createElement('button');
                deleteSubBtn.className = 'delete-subtask-btn';
                deleteSubBtn.innerHTML = '&times;';
                deleteSubBtn.title = "Delete Subtask";
                deleteSubBtn.onclick = () => deleteSubtask(index, subIndex);

                subtaskItem.appendChild(subCheckbox);
                subtaskItem.appendChild(subText);
                subtaskItem.appendChild(deleteSubBtn);
                subtaskList.appendChild(subtaskItem);
            });

            subtaskSection.appendChild(subtaskList);

            // Input to add a subtask
            const subtaskInputWrapper = document.createElement('div');
            subtaskInputWrapper.className = 'subtask-input-group';

            const subtaskInput = document.createElement('input');
            subtaskInput.type = 'text';
            subtaskInput.placeholder = 'Add a subtask...';
            subtaskInput.className = 'input-field subtask-input';

            subtaskInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    addSubtask(index, subtaskInput.value.trim());
                    subtaskInput.value = '';
                }
            });

            subtaskInputWrapper.appendChild(subtaskInput);
            subtaskSection.appendChild(subtaskInputWrapper);

            todoItem.appendChild(subtaskSection);
            todoListElement.appendChild(todoItem);
        });
    }

    updateBottomTodoBanner(todos);
}

    function addSubtask(todoIndex, text) {
    if (!text) return;
    chrome.storage.local.get({ todos: [] }, (result) => {
        const todos = result.todos;
        todos[todoIndex].subtasks = todos[todoIndex].subtasks || [];
        todos[todoIndex].subtasks.push({ text, completed: false });
        chrome.storage.local.set({ todos }, () => {
            renderTodos(todos);
            showActionFeedback('Subtask added!', 'success');
        });
    });
}

function toggleSubtask(todoIndex, subIndex) {
    chrome.storage.local.get({ todos: [] }, (result) => {
        const todos = result.todos;
        todos[todoIndex].subtasks[subIndex].completed = !todos[todoIndex].subtasks[subIndex].completed;
        chrome.storage.local.set({ todos }, () => {
            renderTodos(todos);
        });
    });
}

function deleteSubtask(todoIndex, subIndex) {
    chrome.storage.local.get({ todos: [] }, (result) => {
        const todos = result.todos;
        todos[todoIndex].subtasks.splice(subIndex, 1);
        chrome.storage.local.set({ todos }, () => {
            renderTodos(todos);
            showActionFeedback('Subtask deleted.', 'success');
        });
    });
}



    function addTodo() { 
        if(!todoInput) return;
        const text = todoInput.value.trim();
        if (!text) { showActionFeedback('To-do task cannot be empty.', 'error'); return; }
        chrome.storage.local.get({ todos: [] }, (result) => {
            const newTodos = [...result.todos, {
                text: text,
                completed: false,
                id: Date.now(),
                subtasks: [] // 👈 This adds the subtask array to every new task
                }];
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
            if (!result.todos || !result.todos[index]) return;
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
            if (!result.todos || !result.todos[index]) return;
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
            // Don't hide the card here, let navigation logic handle it
            // if (upcomingRemindersCard.classList.contains('hidden')) { // Only hide if already hidden by nav
            //     upcomingRemindersCard.classList.add('hidden'); 
            // }
            return;
        }
        // upcomingRemindersCard.classList.remove('hidden'); // Show card if there are reminders
        
        reminders.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime)); 

        reminders.forEach((reminder) => { 
            const itemEl = document.createElement('div');
            itemEl.className = 'reminder-item'; 
            const textPart = document.createElement('span');
            textPart.className = 'reminder-text-main';
            textPart.textContent = reminder.text;
            const dateTimeBadge = document.createElement('span');
            dateTimeBadge.className = 'reminder-time-badge';
            const d = new Date(reminder.dateTime);
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            let dateDisplay = '';
            if (d.toDateString() === today.toDateString()) dateDisplay = 'Today, ';
            else if (d.toDateString() === tomorrow.toDateString()) dateDisplay = 'Tomorrow, ';
            else dateDisplay = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined }) + ', ';
            dateTimeBadge.textContent = dateDisplay + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const actionsWrapper = document.createElement('div');
            actionsWrapper.className = 'reminder-item-actions';
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.177-2.365.298a.75.75 0 0 0-.53.904l.523 4.386A3.75 3.75 0 0 0 7.48 12.5H12.52a3.75 3.75 0 0 0 3.352-2.912l.523-4.386a.75.75 0 0 0-.53-.904c-.785-.12-1.57-.221-2.365-.298v-.443A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" /></svg>';
            deleteBtn.title = "Delete Reminder";
            deleteBtn.onclick = () => deleteCustomReminderById(reminder.id); 
            actionsWrapper.appendChild(deleteBtn);
            itemEl.appendChild(textPart);
            itemEl.appendChild(dateTimeBadge);
            itemEl.appendChild(actionsWrapper);
            upcomingRemindersList.appendChild(itemEl);
        });
    }
    
    function handleNewReminderSubmit(e) {
        e.preventDefault();
        if (!reminderTextInput || !reminderTimeInput || !reminderDateInput || !newReminderForm) return;
        const text = reminderTextInput.value.trim();
        const time = reminderTimeInput.value; 
        const dateStr = reminderDateInput.value; 
        if (!text || !time) {
            showActionFeedback('Reminder text and time are required.', 'error'); return;
        }
        let reminderDateTime;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); 
        let effectiveDateStr;
        if (dateStr) effectiveDateStr = dateStr;
        else {
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            effectiveDateStr = `${year}-${month}-${day}`;
        }
        reminderDateTime = new Date(`${effectiveDateStr}T${time}`);
        if (reminderDateTime <= now) {
            showActionFeedback('Reminder date/time must be in the future.', 'error'); return;
        }
        const newReminder = {
            id: `custom-${Date.now()}`, text: text, time: time, 
            date: effectiveDateStr, dateTime: reminderDateTime.toISOString(), 
            createdAt: new Date().toISOString()
        };
        chrome.storage.local.get({ customReminders: [] }, (result) => {
            const updatedReminders = [...result.customReminders, newReminder];
            chrome.storage.local.set({ customReminders: updatedReminders }, () => {
                const formattedDateTime = reminderDateTime.toLocaleDateString([], {month: 'short', day: 'numeric', year: reminderDateTime.getFullYear() !== today.getFullYear() ? 'numeric' : undefined }) + ', ' + 
                                      reminderDateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                showActionFeedback(`Reminder set for ${formattedDateTime}!`, 'success');
                speak(`Reminder set for ${text}`);
                renderUpcomingReminders(updatedReminders); 
                newReminderForm.reset(); 
                if(reminderDateInput) reminderDateInput.value = ''; 
                chrome.runtime.sendMessage({ action: "scheduleCustomReminder", reminder: newReminder }, response => {
                    if (chrome.runtime.lastError) {
                        console.error("Error sending scheduleCustomReminder:", chrome.runtime.lastError.message);
                        showActionFeedback('Error scheduling alarm.', 'error');
                    } else if (response && response.status) { /* console.log(response.status) */ }
                });
            });
        });
    }
    if(newReminderForm) newReminderForm.addEventListener('submit', handleNewReminderSubmit);

    function deleteCustomReminderById(reminderIdToDelete) { 
         chrome.storage.local.get({ customReminders: [] }, (result) => {
            const reminderToDelete = result.customReminders.find(r => r.id === reminderIdToDelete);
            if (!reminderToDelete) { console.error("Reminder to delete not found by ID:", reminderIdToDelete); return; }
            if (confirm(`Are you sure you want to delete the reminder: "${reminderToDelete.text}"?`)) {
                const updatedReminders = result.customReminders.filter(r => r.id !== reminderIdToDelete); 
                chrome.storage.local.set({ customReminders: updatedReminders }, () => {
                    renderUpcomingReminders(updatedReminders);
                    showActionFeedback('Reminder deleted.', 'success');
                    speak("Reminder deleted");
                    chrome.runtime.sendMessage({ action: "cancelCustomReminder", reminderId: reminderToDelete.id }, response => {
                         if (chrome.runtime.lastError) console.error("Error sending cancelCustomReminder:", chrome.runtime.lastError.message);
                         // else if (response && response.status) console.log(response.status);
                    });
                });
            }
        });
    }

    // --- YouTube Stats Logic (REMOVED) ---
    // No YouTube related DOM elements or functions anymore.

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

    // --- Voice Settings & Discord Webhook URL ---
    if(updateVoiceSettingsButton) updateVoiceSettingsButton.addEventListener('click', () => {
        if(!voiceSelect || !enableVoiceGreeting || !enableSpokenReminders || !discordWebhookUrlInput) return;
        const selectedVoiceName = voiceSelect.value; 
        const greetingEnabled = enableVoiceGreeting.checked;
        const remindersEnabled = enableSpokenReminders.checked;
        const discordUrl = discordWebhookUrlInput.value.trim();

        if (discordUrl && !discordUrl.startsWith("https://discord.com/api/webhooks/")) {
            showSettingsStatus('Invalid Discord Webhook URL format. It should start with "https://discord.com/api/webhooks/".', 'error', 5000);
            return;
        }

        chrome.storage.local.set({
            voiceName: selectedVoiceName,
            voiceGreetingEnabled: greetingEnabled,
            spokenRemindersEnabled: remindersEnabled,
            discordWebhookUrl: discordUrl 
        }, () => {
            showSettingsStatus('Settings updated successfully!', 'success');
            speak("Settings updated");
            if(discordUrl) { // Log to Discord if URL is provided
                 chrome.runtime.sendMessage({ 
                    action: "logToDiscordViaBackground", 
                    logMessage: "Extension settings updated via popup.", 
                    logType: "info" 
                });
            }
        });
    });

    // --- Application State Management ---
    function checkSetupState() {
        chrome.storage.local.get(['setupComplete', 'userProfile', 'todos', 'customReminders', 'discordWebhookUrl'], (result) => { // Added discordWebhookUrl
            if (result.setupComplete && result.userProfile && result.userProfile.name) {
                if(setupSection) setupSection.classList.add('hidden');
                if(mainAppSection) mainAppSection.classList.remove('hidden');
                showView(homeScreenNav); 
                greetUser(result.userProfile.name);
                renderTodos(result.todos || []); 
                updateBottomTodoBanner(result.todos || []);
                
                if(discordWebhookUrlInput && result.discordWebhookUrl) { // Load Discord URL on setup check
                    discordWebhookUrlInput.value = result.discordWebhookUrl;
                } else if (discordWebhookUrlInput) {
                     discordWebhookUrlInput.value = '';
                }

            } else { 
                if(setupSection) setupSection.classList.remove('hidden');
                if(mainAppSection) mainAppSection.classList.add('hidden');
                showView(null); 
                updateBottomTodoBanner([]); 
                if(upcomingRemindersCard) upcomingRemindersCard.classList.add('hidden');
                if(todoListElement) todoListElement.innerHTML = '<p class="info-text centered-text">No tasks yet.</p>';
                if(upcomingRemindersList) upcomingRemindersList.innerHTML = '<p class="info-text centered-text">No upcoming reminders set.</p>';
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
            showActionFeedback(request.message, request.toastType || 'success'); 
            sendResponse({status: "Feedback shown via popup relay"});
        }
        return true; 
    });
});
