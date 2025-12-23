const messageForm = document.querySelector(".prompt__form");
const chatHistoryContainer = document.querySelector(".chats");
const suggestionItems = document.querySelectorAll(".suggests__item");

const themeToggleButton = document.getElementById("themeToggler");
const clearChatButton = document.getElementById("deleteButton");

let currentUserMessage = null;
let isGeneratingResponse = false;

const GOOGLE_API_KEY = "/////";
const API_REQUEST_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GOOGLE_API_KEY}`;

// Load saved chat history
const loadSavedChatHistory = () => {
  const savedConversations = JSON.parse(localStorage.getItem("saved-api-chats")) || [];
  chatHistoryContainer.innerHTML = "";

  savedConversations.forEach((conv) => {
    addChatMessage("You", conv.userMessage);
    const reply = conv.apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    addChatMessage("Gemini", reply);
  });
};

// Add chat message with Markdown and code highlight
const addChatMessage = (sender, text) => {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", sender === "You" ? "message--outgoing" : "message--incoming");

  messageElement.innerHTML = `
    <div class="message__content">
      <p class="message__text">${marked.parse(text)}</p>
    </div>
  `;

  chatHistoryContainer.appendChild(messageElement);
  chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;

  // Highlight code blocks
  hljs.highlightAll();

  // Add copy button to code blocks
  messageElement.querySelectorAll("pre").forEach((block) => {
    if (!block.querySelector(".code__copy-btn")) {
      const copyButton = document.createElement("button");
      copyButton.classList.add("code__copy-btn");
      copyButton.innerHTML = `<i class='bx bx-copy'></i>`;
      block.appendChild(copyButton);

      copyButton.addEventListener("click", () => {
        navigator.clipboard.writeText(block.querySelector("code").innerText);
        copyButton.innerHTML = `<i class='bx bx-check'></i>`;
        setTimeout(() => (copyButton.innerHTML = `<i class='bx bx-copy'></i>`), 2000);
      });
    }
  });
};

// Request API response
const requestApiResponse = async () => {
  if (!currentUserMessage) return;

  isGeneratingResponse = true;
  addChatMessage("Gemini", ""); // placeholder

  const loadingElement = chatHistoryContainer.lastElementChild.querySelector(".message__text");
  loadingElement.innerText = "Typing...";

  try {
    const response = await fetch(API_REQUEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: currentUserMessage }] }]
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "API error");

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
    loadingElement.innerHTML = marked.parse(reply);

    // Save conversation
    const savedConversations = JSON.parse(localStorage.getItem("saved-api-chats")) || [];
    savedConversations.push({ userMessage: currentUserMessage, apiResponse: data });
    localStorage.setItem("saved-api-chats", JSON.stringify(savedConversations));

    // Highlight code blocks
    hljs.highlightAll();
  } catch (error) {
    loadingElement.innerText = "Error: " + error.message;
    console.error(error);
  } finally {
    isGeneratingResponse = false;
  }
};

// Handle outgoing message
const handleOutgoingMessage = () => {
  const inputField = messageForm.querySelector(".prompt__form-input");
  currentUserMessage = inputField.value.trim();
  if (!currentUserMessage || isGeneratingResponse) return;

  addChatMessage("You", currentUserMessage);
  inputField.value = "";
  requestApiResponse();
};

// Theme toggle
themeToggleButton.addEventListener("click", () => {
  const isLight = document.body.classList.toggle("light_mode");
  themeToggleButton.querySelector("i").className = isLight ? "bx bx-moon" : "bx bx-sun";
});

// Clear chat
clearChatButton.addEventListener("click", () => {
  if (confirm("Are you sure you want to delete all chat history?")) {
    localStorage.removeItem("saved-api-chats");
    chatHistoryContainer.innerHTML = "";
    currentUserMessage = null;
    isGeneratingResponse = false;
  }
});

// Suggestions
suggestionItems.forEach(item => {
  item.addEventListener("click", () => {
    currentUserMessage = item.querySelector(".suggests__item-text").innerText;
    handleOutgoingMessage();
  });
});

// Form submission
messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  handleOutgoingMessage();
});

// Load previous chats
loadSavedChatHistory();
