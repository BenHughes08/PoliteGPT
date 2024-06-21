console.log("Content script loaded.");

let init = false;
let defaultButtonColour = 'grey';

// Function to update button state based on textarea content
function updateButtonState() {
    // Get the textarea element
    let textarea = document.getElementById("prompt-textarea");

    // Get the send button element
    let sendButton = document.querySelector('[data-testid="fruitjuice-send-button"]');

    // Check if textarea and sendButton exist
    if (textarea && sendButton) {
        if (!init) {
            defaultButtonColour = sendButton.style.backgroundColor || defaultButtonColour;
        }

        textarea.setAttribute("placeholder", "Message ChatGPT (remember to use please and thank you 😊)");

        // Get the textarea value
        let textareaValue = textarea.value.toLowerCase(); // Convert to lowercase for case-insensitive matching

        if (textareaValue.trim() === "") {
            sendButton.style.backgroundColor = defaultButtonColour;
            sendButton.disabled = true; // Disable button if textarea is empty
        } else {
            // Check if textarea value contains "please" or "thank you"
            if (textareaValue.includes("please") || textareaValue.includes("thank you")) {
                // Enable button and set background color to green
                sendButton.disabled = false;
                sendButton.style.backgroundColor = "green";
            } else {
                // Disable button and set background color to red
                sendButton.disabled = true;
                sendButton.style.backgroundColor = "red";
            }
        }
    }

    init = true;
}

// Listen for input events on #prompt-textarea
document.addEventListener("input", function(event) {
    if (event.target && event.target.id === "prompt-textarea") {
        updateButtonState();
    }
});

// Function to handle keydown events on input fields and textareas
function handleKeydown(event) {
    // Check if the Enter key (key code 13) is pressed
    if (event.key === 'Enter') {
        let textarea = document.getElementById("prompt-textarea");
        let textareaValue = textarea.value.toLowerCase(); // Get current textarea value

        if (textareaValue.trim() === "") {
          sendButton.style.backgroundColor = defaultButtonColour;
          sendButton.disabled = true; // Disable button if textarea is empty
          return 
        }
        // Check if the textarea contains "please" or "thank you"
        if (textareaValue.includes("please") || textareaValue.includes("thank you")) {
            // Prompt the user for confirmation
            let confirmed = window.confirm("Are you sure you want to submit this form?");

            // If the user confirms, change button color back to default
            if (confirmed) {
                let sendButton = document.querySelector('[data-testid="fruitjuice-send-button"]');
                sendButton.style.backgroundColor = defaultButtonColour;
                sendButton.disabled = true; // Disable button after submission
                updateButtonState(); // Update button state after confirming
            } else {
                event.preventDefault(); // Prevent form submission if not confirmed
                console.log("Form submission prevented.");
            }
        }
    }

    // Check if Shift key is pressed twice in succession (Shift key code is 16)
    if (event.key === 'Shift' && event.repeat) {
        let textarea = document.getElementById("prompt-textarea");
        textarea.value += " please"; // Append " please" to the end of the textarea value
        updateButtonState(); // Update button state after modifying textarea
    }
}

// Attach the keydown event listener to input fields and textareas
document.addEventListener("keydown", function(event) {
    if (event.target.tagName === 'TEXTAREA') {
        handleKeydown(event);
        updateButtonState();
    }
});

// Initial check on load
updateButtonState();
