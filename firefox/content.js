console.log("Content script loaded.");

let init = false;
let defaultButtonColour = 'grey';
let actualInputField;
let proxyInputField;
let proxyInputValue;

function isSafe(value) {

    if (value.includes("please") || value.includes("thank you")) {
        return true;
    }


    return false;

}

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
            actualInputField = textarea;

            proxyInputField = textarea.cloneNode(true);

            textarea.parentElement.appendChild (proxyInputField);
            proxyInputField.setAttribute('id', 'prompt-textarea-proxy')

            // textarea.style.display = "none";


            sendButton.addEventListener('keydown', function(event) {
                if (event.key === "Enter") {
                    textarea.style.display = "none";
                    proxyInputField.style.display = "block";

                }
            })

            // Event listener for keydown on proxy textarea
            proxyInputField.addEventListener("keydown", function(event) {

                let textarea = document.getElementById("prompt-textarea");
                textarea.value = proxyInputField.value; // Append value with newline


                if (event.key === "Enter") {
                    console.log('enter')
                    // Prevent default behavior (form submission)
                    event.preventDefault();
                    if (isSafe(proxyInputField.value)) {
                        console.log('safe')

                        // Pass value to real textarea

                        // Clear proxy textarea value
                        proxyInputField.value = "";

                        // Toggle visibility back to real textarea
                        textarea.style.display = "block";
                        proxyInputField.style.display = "none";

                        const enterEvent = new Event("change");
                        textarea.dispatchEvent(enterEvent);


                        textarea.value = textarea.value.replace("\n", "");

                        textarea.focus();
                        sendButton.click();
                    }
                }
            });


            proxyInputField.addEventListener('input', function() {
                let proxyInputValue = proxyInputField.value.toLowerCase(); // Convert to lowercase for case-insensitive matching

                    if (proxyInputValue.trim() === "") {
                        sendButton.style.backgroundColor = defaultButtonColour;
                        sendButton.disabled = true; // Disable button if textarea is empty
                    } else {
                        // Check if textarea value contains "please" or "thank you"
                        if (isSafe(proxyInputField.value)) {
                            // Enable button and set background color to green
                            sendButton.disabled = false;
                            sendButton.style.backgroundColor = "green";

                        } else {
                            // Disable button and set background color to red
                            sendButton.disabled = true;
                            sendButton.style.backgroundColor = "red";
                        }
                    }
            })

        }

        proxyInputField.setAttribute("placeholder", "Message ChatGPT (remember to use please and thank you 😊)");

        // Get the textarea value
        
    }

    init = true;
}


// Initial check on load
updateButtonState();