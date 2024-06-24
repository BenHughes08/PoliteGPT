console.log('Content script loaded');
console.log('Current URL:', window.location.href);

// Function to copy styles from one element to another
function copyStyles(source, target) {
  const computedStyle = window.getComputedStyle(source);
  for (let key of computedStyle) {
    target.style[key] = computedStyle[key];
  }
}

// Create a proxy textarea to hold the user input temporarily
const realTextarea = document.getElementById('prompt-textarea');
if (realTextarea) {
  const proxyTextarea = realTextarea.cloneNode(true);
  proxyTextarea.id = 'proxy-textarea';
  copyStyles(realTextarea, proxyTextarea);
  realTextarea.style.display = 'none';
  realTextarea.parentNode.insertBefore(proxyTextarea, realTextarea);

  // Function to update button state and handle sending message
  function updateButtonState() {
    const sendButton = document.querySelector('[data-testid="fruitjuice-send-button"]');
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
    const value = proxyTextarea.value.toLowerCase().trim();

    if (value.length === 0 || (!value.includes('please') && !value.includes('thank you'))) {
      event.preventDefault(); // Prevent default form submission
      console.log('Please include "please" or "thank you" in your prompt.');
    } else {
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

      // Clear the proxy and real textareas and reset button color after submission
      setTimeout(() => {
        proxyTextarea.value = '';
        realTextarea.value = '';
        const sendButton = document.querySelector('[data-testid="fruitjuice-send-button"]');
        if (sendButton) {
          sendButton.style.backgroundColor = '';
        }
        updateButtonState();
      }, 100);
    }
  }

  // Adjust the proxy textarea height based on content
  proxyTextarea.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  // Intercept form submission
  document.addEventListener('submit', function(event) {
    if (event.target && event.target.id === 'prompt-form') {
      validateAndSend(event);
    }
  });

  // Listen for input changes in proxyTextarea
  proxyTextarea.addEventListener('input', function() {
    updateButtonState();
  });

  // Listen for Enter key press in proxyTextarea
  proxyTextarea.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      validateAndSend(event);
    }
  });

  // Listen for initial page load
  document.addEventListener('DOMContentLoaded', function() {
    updateButtonState(); // Update button state/color initially
  });
}
