console.log('Content script loaded');
console.log('Current URL:', window.location.href);

// Function to update button state and color
function updateButtonState() {
  const textarea = document.getElementById('prompt-textarea');
  const sendButton = document.querySelector('[data-testid="fruitjuice-send-button"]');
  
  if (textarea && sendButton) {
    const value = textarea.value.toLowerCase();
    
    // Enable/disable button based on textarea content
    if (value.trim().length === 0 || (!value.includes('please') && !value.includes('thank you'))) {
      sendButton.disabled = true;
      sendButton.style.backgroundColor = 'red';
    } else {
      sendButton.disabled = false;
      sendButton.style.backgroundColor = 'green';
    }
  }
}

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
