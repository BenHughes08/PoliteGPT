console.log('Content script loaded');

// Function to update button state and handle sending message
function updateButtonState() {
  console.log('updateButtonState called');
  const sendButton = document.querySelector('[data-testid="fruitjuice-send-button"]');
  const proxyTextarea = document.getElementById('proxy-textarea');
  
  if (sendButton && proxyTextarea) {
    console.log('sendButton and proxyTextarea found');
    const value = proxyTextarea.value.toLowerCase().trim();
    
    // Enable/disable button based on textarea content
    if (value.length === 0 || (!value.includes('please') && !value.includes('thank you'))) {
      sendButton.disabled = true;
      sendButton.style.backgroundColor = 'red';
      console.log('sendButton disabled');
    } else {
      sendButton.disabled = false;
      sendButton.style.backgroundColor = 'green';
      console.log('sendButton enabled');
    }
  } else {
    console.log('sendButton or proxyTextarea not found');
  }
}

// Function to handle form submission validation and sending
function validateAndSend(event) {
  console.log('validateAndSend called');
  const proxyTextarea = document.getElementById('proxy-textarea');
  
  if (proxyTextarea) {
    const value = proxyTextarea.value.toLowerCase().trim();
    
    if (value.length === 0 || (!value.includes('please') && !value.includes('thank you'))) {
      event.preventDefault(); // Prevent default form submission
      console.log('Please include "please" or "thank you" in your prompt.');
    } else {
      console.log('Valid message');
      // Trigger sending logic here (adjust as per your extension's functionality)
      proxyTextarea.value = ''; // Reset proxy textarea
      updateButtonState(); // Update button state after sending
    }
  } else {
    console.log('proxyTextarea not found');
  }
}

// Function to create proxy textarea and initialize
function initialize() {
  console.log('initialize called');
  const observer = new MutationObserver(() => {
    console.log('MutationObserver callback');
    updateButtonState(); // Update button state on dynamic content load
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial setup
  createProxyTextarea(); // Create proxy textarea on initial load
  updateButtonState(); // Update button state on initial load
}

// Create a proxy textarea to hold the user input temporarily
function createProxyTextarea() {
  console.log('createProxyTextarea called');
  const realTextarea = document.getElementById('prompt-textarea');
  
  if (realTextarea) {
    console.log('realTextarea found');
    const proxyTextarea = realTextarea.cloneNode(true);
    proxyTextarea.id = 'proxy-textarea';
    copyStyles(realTextarea, proxyTextarea);
    realTextarea.style.display = 'none';
    realTextarea.parentNode.insertBefore(proxyTextarea, realTextarea);
    
    // Adjust width to avoid overlapping with send button
    proxyTextarea.style.width = 'calc(100% - 20px)';
    
    // Listen for input changes in proxyTextarea
    proxyTextarea.addEventListener('input', function () {
      updateButtonState();
      // Adjust the height of the proxy textarea to match content
      proxyTextarea.style.height = 'auto';
      proxyTextarea.style.height = `${proxyTextarea.scrollHeight}px`;
    });
    
    // Listen for form submission
    document.addEventListener('submit', function (event) {
      if (event.target && event.target.id === 'prompt-form') {
        validateAndSend(event);
      }
    });
    
    return proxyTextarea;
  } else {
    console.log('realTextarea not found');
  }
}

// Utility function to copy styles from one element to another
function copyStyles(source, target) {
  console.log('copyStyles called');
  const computedStyle = window.getComputedStyle(source);
  for (let key of computedStyle) {
    target.style[key] = computedStyle[key];
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded event');
  initialize(); // Ensure initialization is called on script load
});
