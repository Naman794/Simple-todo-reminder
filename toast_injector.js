// toast_injector.js

let toastContainer = null;
const TOAST_DISMISS_DELAY = 4000; // 4 seconds, can be adjusted (3-5 seconds as requested)
const TOAST_ANIMATION_DURATION = 400; // Matches CSS transition duration

function createToastContainer() {
    if (document.getElementById('custom-toast-container-ext')) {
        return document.getElementById('custom-toast-container-ext');
    }
    const container = document.createElement('div');
    container.id = 'custom-toast-container-ext';
    container.className = 'custom-toast-container'; // From toast_style.css
    document.body.appendChild(container);
    return container;
}

function showToast(message) {
    if (!toastContainer) {
        toastContainer = createToastContainer();
    }

    const toast = document.createElement('div');
    toast.className = 'custom-toast-notification'; // From toast_style.css
    toast.textContent = message;

    // Prepend so new toasts appear at the "end" of the flex-direction: column-reverse container
    // which visually means they appear at the bottom and push older ones up.
    if (toastContainer.firstChild) {
        toastContainer.insertBefore(toast, toastContainer.firstChild);
    } else {
        toastContainer.appendChild(toast);
    }
    

    // Trigger the slide-in animation
    // We need a slight delay to allow the element to be added to the DOM before adding the 'show' class
    requestAnimationFrame(() => {
        setTimeout(() => { // Further delay to ensure transition is picked up
            toast.classList.add('show');
        }, 20); 
    });

    // Auto-dismiss
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide'); // Trigger hide animation

        // Remove the toast from DOM after the hide animation completes
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            // If container is empty, we could remove it, but it's fine to leave it.
            // if (toastContainer && !toastContainer.hasChildNodes()) {
            //     toastContainer.remove();
            //     toastContainer = null;
            // }
        }, TOAST_ANIMATION_DURATION);
    }, TOAST_DISMISS_DELAY);
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "showCustomToast" && request.message) {
        showToast(request.message);
        sendResponse({ status: "Toast displayed or queued by content script" });
    }
    return true; // Keep message channel open for asynchronous response if needed
});

// Initialize the container on script load if preferred,
// or create it on demand as done in showToast.
// toastContainer = createToastContainer(); 
// console.log("Toast Injector Content Script Loaded.");
