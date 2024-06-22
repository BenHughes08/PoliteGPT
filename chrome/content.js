console.log('Content script loaded');
console.log('Current URL:', window.location.href);

// Function to update button state and handle sending message
function updateButtonState() {
  const textarea = document.getElementById('prompt-textarea');
  const sendButton = document.querySelector('[data-testid="fruitjuice-send-button"]');
  
  if (textarea && sendButton) {
    const value = textarea.value.toLowerCase().trim();
    
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

// Intercept form submission or send action
document.addEventListener('submit', function(event) {
  const textarea = document.getElementById('prompt-textarea');
  
  if (textarea) {
    const value = textarea.value.toLowerCase().trim();
    
    // Prevent form submission if textarea content does not contain "please" or "thank you"
    if (value.length === 0 || (!value.includes('please') && !value.includes('thank you'))) {
      event.preventDefault();
      console.log('Please include "please" or "thank you" in your prompt.');
    }
  }
});

// Listen for input changes in #prompt-textarea
document.addEventListener('input', function(event) {
  if (event.target && event.target.id === 'prompt-textarea') {
    updateButtonState();
  }
});

// Listen for initial page load
document.addEventListener('DOMContentLoaded', function() {
  updateButtonState(); // Update button state/color initially
});
