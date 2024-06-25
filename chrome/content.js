console.log('Content script loaded');
console.log('Current URL:', window.location.href);

let proxyTextarea; // Variable to hold the proxy textarea
let realTextarea;  // Variable to hold the real textarea
let sendButton;    // Variable to hold the send button

// Function to copy styles from one element to another
function copyStyles(source, target) {
  const computedStyle = window.getComputedStyle(source);
  for (let key of computedStyle) {
    target.style[key] = computedStyle[key];
  }
}

// Function to update button state and handle sending message
function updateButtonState() {
  const value = proxyTextarea.value.toLowerCase().trim();

  if (sendButton) {
    // Enable/disable button based on textarea content
    if (value.length === 0 || (!value.includes('please') && !value.includes('thank you'))) {
      sendButton.disabled = true;
      sendButton.style.backgroundColor = 'red';
    } else {
      sendButton.disabled = false;
      sendButton.style.backgroundColor = 'green';
    }
  }
}

// Function to handle form submission validation and sending
function validateAndSend(event) {
  event.preventDefault(); // Prevent default form submission
  const value = proxyTextarea.value.toLowerCase().trim();

  if (value.length === 0 || (!value.includes('please') && !value.includes('thank you'))) {
    console.log('Please include "please" or "thank you" in your prompt.');
    return;
  }

  // Copy content from proxyTextarea to realTextarea and trigger enter event
  realTextarea.value = proxyTextarea.value;

  const inputEvent = new Event('input', { bubbles: true });
  realTextarea.dispatchEvent(inputEvent);

  const enterEvent = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key: 'Enter',
    code: 'Enter',
    keyCode: 13
  });
  realTextarea.dispatchEvent(enterEvent);

  // Reset proxy textarea and button after submission
  proxyTextarea.value = '';
  sendButton.style.backgroundColor = '';
  updateButtonState();
  // Reset the height of the proxy textarea
  proxyTextarea.style.height = 'auto';
  proxyTextarea.style.height = '34px'; // Set to original height
}

// Create a proxy textarea to hold the user input temporarily
function createProxyTextarea() {
  realTextarea = document.getElementById('prompt-textarea');
  if (realTextarea) {
    proxyTextarea = realTextarea.cloneNode(true);
    proxyTextarea.id = 'proxy-textarea';
    copyStyles(realTextarea, proxyTextarea);
    realTextarea.style.display = 'none';
    realTextarea.parentNode.insertBefore(proxyTextarea, realTextarea);

    // Match width of realTextarea
    proxyTextarea.style.width = `${realTextarea.offsetWidth}px`;

    // Listen for input changes in proxyTextarea
    proxyTextarea.addEventListener('input', function () {
      updateButtonState();
      // Adjust the height of the proxy textarea to match content
      proxyTextarea.style.height = 'auto';
      proxyTextarea.style.height = `${proxyTextarea.scrollHeight}px`;
    });

    // Find and assign send button
    sendButton = document.querySelector('[data-testid="fruitjuice-send-button"]');
    if (sendButton) {
      sendButton.addEventListener('click', validateAndSend);
    }

    return proxyTextarea;
  }
}

// Function to reload the page
function reloadPage() {
  setTimeout(() => {
    window.location.reload();
  }, 250);
}

// Function to initialize the script
function initialize() {
  if (!proxyTextarea) {
    createProxyTextarea();
  }
  updateButtonState();

  // Observe changes in the page's title to detect URL changes
  const titleObserver = new MutationObserver(() => {
    const newURL = window.location.href;
    console.log('Page URL changed, reloading script...');
    reloadPage();
  });
  
  titleObserver.observe(document.querySelector('title'), { subtree: true, characterData: true, childList: true });
}

// Ensure initialization is called on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initialize);
