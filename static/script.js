// ============================================================
// 1. GLOBAL VARIABLES
// ============================================================

// Retrieve the previous travel conversation's thread ID from
// the browser's local storage.
// If no thread ID exists, use null.
let currentThreadId =
    localStorage.getItem("travel_thread_id") || null;

// Store the latest AI answer in Markdown format.
// This variable is used to check whether a result is available
// before allowing the user to download a PDF.
let latestAnswerMarkdown = "";


// ============================================================
// 2. SET A SAMPLE TRAVEL PROMPT
// ============================================================

function setPrompt(text) {
    // Find the textarea in index.html using its ID.
    // Put the selected sample travel request into the textarea.
    document.getElementById("userInput").value = text;
}


// ============================================================
// 3. SHOW OR HIDE THE LOADING INDICATOR
// ============================================================

function setLoading(isLoading) {
    // Find the send button, its text, and the loading spinner.
    const sendBtn = document.getElementById("sendBtn");
    const btnText = document.getElementById("btnText");
    const btnLoader = document.getElementById("btnLoader");

    // Prevent repeated submissions while a request is running.
    sendBtn.disabled = isLoading;

    if (isLoading) {
        // Hide the normal button text.
        btnText.classList.add("hidden");

        // Show the loading spinner.
        btnLoader.classList.remove("hidden");
    } else {
        // Restore the normal button text.
        btnText.classList.remove("hidden");

        // Hide the loading spinner.
        btnLoader.classList.add("hidden");
    }
}


// ============================================================
// 4. DISPLAY AN ERROR MESSAGE
// ============================================================

function showError(message) {
    // Find the error message container in index.html.
    const errorBox = document.getElementById("errorBox");

    // Display the supplied error as plain text.
    errorBox.textContent = message;

    // Remove the hidden CSS class so the message is visible.
    errorBox.classList.remove("hidden");
}


// ============================================================
// 5. HIDE AND CLEAR AN ERROR MESSAGE
// ============================================================

function hideError() {
    // Find the error message container.
    const errorBox = document.getElementById("errorBox");

    // Hide the error container.
    errorBox.classList.add("hidden");

    // Remove the previous error text.
    errorBox.textContent = "";
}


// ============================================================
// 6. DISPLAY THE AI-GENERATED TRAVEL PLAN
// ============================================================

function showResult(answer, threadId) {
    // Save the original Markdown answer for later use.
    latestAnswerMarkdown = answer;

    // Find the result section and its content elements.
    const resultSection = document.getElementById("resultSection");
    const resultBox = document.getElementById("resultBox");
    const threadInfo = document.getElementById("threadInfo");

    // Check whether the Markdown rendering library is available.
    if (typeof marked !== "undefined") {
        // Convert Markdown into HTML so headings, lists, and tables
        // can be displayed with formatting.
        resultBox.innerHTML = marked.parse(answer);
    } else {
        // If Markdown is unavailable, display the answer as
        // ordinary text instead of formatted HTML.
        resultBox.innerText = answer;
    }

    // Display the conversation's thread ID.
    threadInfo.textContent = `Thread ID: ${threadId}`;

    // Make the previously hidden result section visible.
    resultSection.classList.remove("hidden");

    // Scroll smoothly to the generated travel plan.
    resultSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


// ============================================================
// 7. SEND THE TRAVEL REQUEST TO FASTAPI
// ============================================================

async function sendMessage() {
    // Clear any error from the previous request.
    hideError();

    // Read the user's travel request from the textarea.
    const input = document.getElementById("userInput");

    // Remove leading and trailing spaces.
    const message = input.value.trim();

    // Stop if the user has not entered a request.
    if (!message) {
        showError("Please enter your travel request first.");
        return;
    }

    // Disable the send button and display the loading spinner.
    setLoading(true);

    try {
        // Send an HTTP POST request to the FastAPI endpoint.
        const response = await fetch("/api/travel", {
            method: "POST",

            // Tell FastAPI that the request body contains JSON.
            headers: {
                "Content-Type": "application/json"
            },

            // Convert the JavaScript object into a JSON string.
            // Include the current thread ID so the backend can
            // associate the request with the same conversation.
            body: JSON.stringify({
                message: message,
                thread_id: currentThreadId
            })
        });

        // Convert the JSON response from FastAPI into a
        // JavaScript object.
        const data = await response.json();

        // Handle an unsuccessful HTTP response or an application
        // response that explicitly reports success: false.
        if (!response.ok || !data.success) {
            throw new Error(data.error || "Something went wrong.");
        }

        // Save the thread ID returned by the backend.
        currentThreadId = data.thread_id;

        // Persist the thread ID in this browser so it can be
        // reused after a page refresh or browser restart.
        localStorage.setItem("travel_thread_id", currentThreadId);

        // Display the generated travel plan and thread ID.
        showResult(data.answer, data.thread_id);

    } catch (error) {
        // Display an error if the request or response processing
        // fails.
        showError(error.message);

    } finally {
        // Always restore the send button, whether the request
        // succeeds or fails.
        setLoading(false);
    }
}


// ============================================================
// 8. COPY THE GENERATED TRAVEL PLAN
// ============================================================

function copyResult() {
    // Find the displayed travel plan.
    const resultBox = document.getElementById("resultBox");

    // Extract readable text without HTML markup.
    const text = resultBox.innerText;

    // Stop if there is nothing to copy.
    if (!text) {
        return;
    }

    // Ask the browser to copy the text to the clipboard.
    navigator.clipboard.writeText(text)
        .then(() => {
            // Find the copy button and remember its original label.
            const copyBtn = document.querySelector(".copy-btn");
            const oldText = copyBtn.textContent;

            // Temporarily show a success message.
            copyBtn.textContent = "Copied!";

            // Restore the original label after 1.4 seconds.
            setTimeout(() => {
                copyBtn.textContent = oldText;
            }, 1400);
        })
        .catch(() => {
            // Display an error if clipboard access fails.
            showError("Could not copy result.");
        });
}


// ============================================================
// 9. DOWNLOAD THE TRAVEL PLAN AS A PDF
// ============================================================

function downloadPDF() {
    // Find the HTML element that contains the printable content.
    const pdfContent = document.getElementById("pdfContent");

    // Stop if no answer is available or the PDF container
    // cannot be found.
    if (!latestAnswerMarkdown || !pdfContent) {
        showError("No travel plan available to download.");
        return;
    }

    // Find the download button and save its original label.
    const downloadBtn = document.querySelector(".download-btn");
    const oldText = downloadBtn.textContent;

    // Inform the user that the PDF is being generated.
    downloadBtn.textContent = "Preparing PDF...";

    // Prevent repeated PDF downloads while one is in progress.
    downloadBtn.disabled = true;

    // Configure the PDF output.
    const options = {
        // Set page margins in inches.
        margin: 0.5,

        // Set the downloaded file's name.
        filename: "ai-travel-plan.pdf",

        // Configure images in the PDF.
        image: {
            type: "jpeg",
            quality: 0.98
        },

        // Configure conversion of HTML into a canvas image.
        html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff"
        },

        // Configure the PDF page format.
        jsPDF: {
            unit: "in",
            format: "a4",
            orientation: "portrait"
        },

        // Try to avoid splitting content across pages.
        pagebreak: {
            mode: ["avoid-all", "css", "legacy"]
        }
    };

    // Generate the PDF from the selected HTML element and
    // trigger the browser download.
    html2pdf()
        .set(options)
        .from(pdfContent)
        .save()

        // Restore the button after a successful download.
        .then(() => {
            downloadBtn.textContent = oldText;
            downloadBtn.disabled = false;
        })

        // Restore the button and show an error if generation fails.
        .catch(() => {
            downloadBtn.textContent = oldText;
            downloadBtn.disabled = false;

            showError("Could not download PDF.");
        });
}


// ============================================================
// 10. SUBMIT THE REQUEST USING CTRL + ENTER
// ============================================================

// Listen for keyboard presses anywhere in the document.
document.addEventListener("keydown", function(event) {

    // If Ctrl and Enter are pressed together, send the request.
    if (event.ctrlKey && event.key === "Enter") {
        sendMessage();
    }
});