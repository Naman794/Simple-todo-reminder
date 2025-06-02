// toast_injector.js

let toastContainer = null;
const TOAST_DISMISS_DELAY = 4000;
const TOAST_ANIMATION_DURATION = 400;

console.log("[ToastInjector] Content script loaded");

function createToastContainer() {
    let existing = document.getElementById('custom-toast-container-ext');
    if (existing) return existing;

    const container = document.createElement('div');
    container.id = 'custom-toast-container-ext';
    container.className = 'custom-toast-container';
    document.body.appendChild(container);
    return container;
}

function showToast(message) {
    if (!toastContainer) {
        toastContainer = createToastContainer();
    }

    const toast = document.createElement('div');
    toast.className = 'custom-toast-notification';
    toast.textContent = message;

    if (toastContainer.firstChild) {
        toastContainer.insertBefore(toast, toastContainer.firstChild);
    } else {
        toastContainer.appendChild(toast);
    }

    requestAnimationFrame(() => {
        setTimeout(() => {
            toast.classList.add('show');
        }, 20);
    });

    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');

        setTimeout(() => {
            toast.remove();
        }, TOAST_ANIMATION_DURATION);
    }, TOAST_DISMISS_DELAY);
}

// ✅ This is crucial: listener must return true for async responses
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("[ToastInjector] Received message:", request);

    if (request.action === "showCustomToast" && request.message) {
        showToast(request.message);
        sendResponse({ status: "Toast shown" });
    }
    return true;
});
