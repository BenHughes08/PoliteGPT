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

// content.js

// Function to handle keydown events on input fields and textareas
function handleKeydown(event) {
    // Check if the Enter key (key code 13) is pressed
    if (event.keyCode === 13) {
        // Prompt the user for confirmation
        let confirmed = window.confirm("Are you sure you want to submit this form?");
        
        // If the user does not confirm, prevent the default action (form submission)
        if (!confirmed) {
            event.preventDefault();
            console.log("Form submission prevented.");
            location.reload();
        }
    }
}

// Attach the keydown event listener to input fields and textareas
document.addEventListener("keydown", function(event) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        handleKeydown(event);
    }
});

// Initial check on load
updateButtonState();
