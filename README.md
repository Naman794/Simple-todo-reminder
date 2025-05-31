# Daily Voice Reminder - Chrome Extension

## 📢 Description

Daily Voice Reminder is a simple yet effective Chrome extension designed to help you keep track of your tasks and get timely voice notifications. It allows you to manage a general to-do list and set custom-timed reminders for specific tasks, ensuring you stay organized and on top of your schedule. The extension also offers personalized greetings and birthday wishes!

## ✨ Features

* **Personalized Setup:** Greet users by name and optionally remember their email and date of birth for birthday greetings. All data is stored locally in the browser.
* **General To-Do List:**
    * Add, manage, and clear general tasks that don't require a specific time alert.
    * Mark tasks as complete/incomplete.
    * Visual banner in the popup to indicate active to-do items.
* **Custom-Timed Reminders:**
    * Set reminders for specific tasks at a specific time on the current day.
    * Receive a system notification and a spoken alert when a custom reminder is due.
    * View and delete upcoming custom reminders.
* **Voice Notifications:**
    * Spoken alerts for custom-timed reminders.
    * Optional spoken "Good morning" greeting at 10 AM on weekdays.
    * Optional spoken "Happy Birthday" greeting.
    * Ability to select from available system voices for TTS (Text-to-Speech).
    * Settings to enable/disable voice greetings and spoken reminders.
* **Action Feedback:** Get clear visual feedback (slide-up popups) for actions like adding tasks, setting reminders, or updating settings.
* **Local Data Storage:** All user data (profile, to-dos, reminders, settings) is stored locally using `chrome.storage.local`, ensuring privacy.
* **Clean & User-Friendly Interface:** Designed for ease of use and clarity.

## ⚙️ How It Works

* **Manifest V3:** Built using the latest Chrome extension manifest version.
* **Popup UI (`popup.html`, `style.css`, `popup.js`):** The main user interface is an HTML page styled with custom CSS and powered by JavaScript for dynamic interactions, data management, and communication with the background script.
* **Background Service Worker (`background.js`):**
    * Manages alarms using the `chrome.alarms` API for:
        * The 10 AM weekday greeting.
        * Daily birthday checks.
        * Custom-timed reminders set by the user.
    * Handles `chrome.notifications` to display system notifications for custom reminders and birthdays.
    * Uses the `chrome.tts` API to provide spoken feedback and alerts.
* **Local Storage (`chrome.storage.local`):** Securely stores user profile information, to-do lists, custom reminder details, and user preferences directly in the user's browser.
* **Content Security Policy (CSP):** Configured in `manifest.json` to enhance security, allowing only necessary resources (like Google Fonts).

## 🛠️ Technologies Used

* **HTML5**
* **CSS3** (Custom styling, no external frameworks like Tailwind are bundled)
* **JavaScript (ES6+)**
* **Chrome Extension APIs:**
    * `chrome.storage` (for local data persistence)
    * `chrome.alarms` (for scheduling events)
    * `chrome.notifications` (for system notifications)
    * `chrome.tts` (Text-to-Speech for voice alerts)
    * `chrome.runtime` (for messaging and lifecycle events)
* **Google Fonts** (Inter)

## 🚀 How to Use

### For End Users (Once Published on Chrome Web Store - *Placeholder*)

1.  Go to the Daily Voice Reminder page on the Chrome Web Store.
2.  Click "Add to Chrome".
3.  The extension icon will appear in your Chrome toolbar. Click it to open the popup and get started!

### For Developers (Loading as an Unpacked Extension)

1.  **Download/Clone the Repository:**
    ```bash
    git clone [https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git](https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git)
    cd YOUR_REPOSITORY_NAME
    ```
    (Replace `YOUR_USERNAME/YOUR_REPOSITORY_NAME` with your actual GitHub details)
2.  **Open Chrome Extensions Page:**
    * Open Google Chrome.
    * Navigate to `chrome://extensions`.
3.  **Enable Developer Mode:**
    * In the top right corner of the Extensions page, toggle "Developer mode" ON.
4.  **Load Unpacked:**
    * Click the "Load unpacked" button that appears.
    * In the file dialog, navigate to the directory where you cloned/downloaded the extension files (the folder containing `manifest.json`).
    * Select this folder.
5.  **Ready to Use:** The "Daily Voice Reminder" extension should now be loaded and visible in your Chrome toolbar and on the `chrome://extensions` page. Click the icon to open the popup.

## 📸 Screenshots

*(It's highly recommended to add screenshots here to showcase your extension's UI and features. For example:)*

* *Screenshot of the initial setup screen.*
* *Screenshot of the main interface showing the to-do list and new reminder form.*
* *Screenshot of the settings section.*
* *Screenshot of a system notification.*

## 🔮 Future Enhancements (Ideas)

* **Date Input for Reminders:** Allow setting reminders for specific future dates.
* **Recurring Reminders:** Option to set reminders that repeat (daily, weekly, etc.).
* **Snooze Functionality:** Add a "Snooze" button to notifications.
* **"Mark as Done" from Notification:** Allow users to mark reminders/tasks as complete directly from the system notification.
* **Themes:** Light/Dark mode options.
* **Data Sync (Optional & Advanced):** Option to sync data across devices (would require a backend and user accounts, significantly increasing complexity).

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME/issues) if you want to contribute.

Please adhere to this project's `code of conduct` (if you add one).

## 📜 License

*(Consider adding a license, e.g., MIT License. If you do, create a `LICENSE.md` file and link to it here.)*

This project is licensed under the [MIT License](LICENSE.md) - see the `LICENSE.md` file for details.

---

Remember to replace placeholders like `YOUR_USERNAME/YOUR_REPOSITORY_NAME` with your actual GitHub details. You should also create the icon files and add actual screenshots where indicated.
