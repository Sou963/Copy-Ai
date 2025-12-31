const messageForm = document.querySelector(".prompt__form");
const chatHistoryContainer = document.querySelector(".chats");
const suggestionItems = document.querySelectorAll(".suggests__item");

const themeToggleButton = document.getElementById("themeToggler");
const clearChatButton = document.getElementById("deleteButton");

// State variables
let currentUserMessage = null;
let isGeneratingResponse = false;

// ================================
// 🔥 OpenRouter Free API CONFIG
// ================================
const API_KEY = "///"; // এখানে আপনার Free API key বসান
const API_REQUEST_URL = "https://openrouter.ai/api/v1/chat/completions";
const FREE_MODEL = "openrouter/auto"; // Free মডেল, এটি কাজ করবে

// ================================
// Load saved chat history
// ================================
const loadSavedChatHistory = () => {
  const savedConversations =
    JSON.parse(localStorage.getItem("saved-api-chats")) || [];
  const isLightTheme = localStorage.getItem("themeColor") === "light_mode";

  document.body.classList.toggle("light_mode", isLightTheme);
  themeToggleButton.innerHTML = isLightTheme
    ? '<i class="bx bx-moon"></i>'
    : '<i class="bx bx-sun"></i>';

  chatHistoryContainer.innerHTML = "";

  savedConversations.forEach((conversation) => {
    const userHtml = `
      <div class="message__content">
        <img class="message__avatar" src="assets/profile.png">
        <p class="message__text">${conversation.userMessage}</p>
      </div>`;

    const outgoing = createChatMessageElement(
      userHtml,
      "message--outgoing"
    );
    chatHistoryContainer.appendChild(outgoing);

    const responseText =
      conversation.apiResponse?.choices?.[0]?.message?.content;
    const parsedApiResponse = marked.parse(responseText);

    const responseHtml = `
      <div class="message__content">
        <img class="message__avatar" src="assets/gemini.svg">
        <p class="message__text"></p>
      </div>
      <span onclick="copyMessageToClipboard(this)" class="message__icon hide">
        <i class='bx bx-copy-alt'></i>
      </span>`;

    const incoming = createChatMessageElement(
      responseHtml,
      "message--incoming"
    );
    chatHistoryContainer.appendChild(incoming);

    showTypingEffect(
      responseText,
      parsedApiResponse,
      incoming.querySelector(".message__text"),
      incoming,
      true
    );
  });

  document.body.classList.toggle("hide-header", savedConversations.length > 0);
};

// Create message element
const createChatMessageElement = (html, ...classes) => {
  const msg = document.createElement("div");
  msg.classList.add("message", ...classes);
  msg.innerHTML = html;
  return msg;
};

// Typing effect
const showTypingEffect = (rawText, htmlText, messageEl, incomingEl, skip) => {
  const copyIcon = incomingEl.querySelector(".message__icon");
  copyIcon.classList.add("hide");

  if (skip) {
    messageEl.innerHTML = htmlText;
    hljs.highlightAll();
    addCopyButtonToCodeBlocks();
    copyIcon.classList.remove("hide");
    return;
  }

  const words = rawText.split(" ");
  let index = 0;

  const typing = setInterval(() => {
    messageEl.innerText += (index ? " " : "") + words[index++];
    if (index === words.length) {
      clearInterval(typing);
      messageEl.innerHTML = htmlText;
      hljs.highlightAll();
      addCopyButtonToCodeBlocks();
      copyIcon.classList.remove("hide");
      isGeneratingResponse = false;
    }
  }, 75);
};

// ================================
// 🔥 OpenRouter Free Request Function
// ================================
const requestApiResponse = async (incomingMessageElement) => {
  const msgEl = incomingMessageElement.querySelector(".message__text");

  try {
    const response = await fetch(API_REQUEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: FREE_MODEL,
        messages: [{ role: "user", content: currentUserMessage }],
      }),
    });

    const responseData = await response.json();

    if (!response.ok)
      throw new Error(responseData.error?.message || "API request failed");

    const responseText = responseData.choices?.[0]?.message?.content;

    const parsedApiResponse = marked.parse(responseText);

    showTypingEffect(
      responseText,
      parsedApiResponse,
      msgEl,
      incomingMessageElement
    );

    // Save conversation
    let logs = JSON.parse(localStorage.getItem("saved-api-chats")) || [];
    logs.push({
      userMessage: currentUserMessage,
      apiResponse: responseData,
    });
    localStorage.setItem("saved-api-chats", JSON.stringify(logs));

  } catch (err) {
    msgEl.innerText = err.message;
    incomingMessageElement.classList.add("message--error");
  } finally {
    incomingMessageElement.classList.remove("message--loading");
    isGeneratingResponse = false;
  }
};

// Loading animation
const displayLoadingAnimation = () => {
  const html = `
    <div class="message__content">
      <img class="message__avatar" src="assets/gemini.svg">
      <p class="message__text"></p>
      <div class="message__loading-indicator">
        <div class="message__loading-bar"></div>
        <div class="message__loading-bar"></div>
        <div class="message__loading-bar"></div>
      </div>
    </div>
    <span class="message__icon hide"><i class='bx bx-copy-alt'></i></span>`;

  const loading = createChatMessageElement(
    html,
    "message--incoming",
    "message--loading"
  );

  chatHistoryContainer.appendChild(loading);
  requestApiResponse(loading);
};

// Add copy button to code blocks
const addCopyButtonToCodeBlocks = () => {
  document.querySelectorAll("pre").forEach((block) => {
    const code = block.querySelector("code");
    if (!code) return;

    const lang =
      [...code.classList].find((c) => c.startsWith("language-"))?.replace("language-", "") ||
      "Text";

    const label = document.createElement("div");
    label.innerText = lang.toUpperCase();
    label.classList.add("code__language-label");
    block.appendChild(label);

    const btn = document.createElement("button");
    btn.classList.add("code__copy-btn");
    btn.innerHTML = "<i class='bx bx-copy'></i>";
    block.appendChild(btn);

    btn.onclick = () => {
      navigator.clipboard.writeText(code.innerText);
      btn.innerHTML = "<i class='bx bx-check'></i>";
      setTimeout(() => (btn.innerHTML = "<i class='bx bx-copy'></i>"), 2000);
    };
  });
};

// Copy message
const copyMessageToClipboard = (btn) => {
  const text = btn.parentElement.querySelector(".message__text").innerText;
  navigator.clipboard.writeText(text);
  btn.innerHTML = "<i class='bx bx-check'></i>";
  setTimeout(() => (btn.innerHTML = "<i class='bx bx-copy-alt'></i>"), 1000);
};

// Send a message
const handleOutgoingMessage = () => {
  const input = messageForm.querySelector(".prompt__form-input");
  currentUserMessage = input.value.trim();

  if (!currentUserMessage || isGeneratingResponse) return;

  isGeneratingResponse = true;

  const userHtml = `
    <div class="message__content">
      <img class="message__avatar" src="assets/profile.png">
      <p class="message__text">${currentUserMessage}</p>
    </div>`;

  const outgoing = createChatMessageElement(userHtml, "message--outgoing");
  chatHistoryContainer.appendChild(outgoing);

  messageForm.reset();
  document.body.classList.add("hide-header");
  setTimeout(displayLoadingAnimation, 300);
};

// Theme toggle
themeToggleButton.onclick = () => {
  const isLight = document.body.classList.toggle("light_mode");
  localStorage.setItem("themeColor", isLight ? "light_mode" : "dark_mode");

  themeToggleButton.querySelector("i").className =
    isLight ? "bx bx-moon" : "bx bx-sun";
};

// Clear chat
clearChatButton.onclick = () => {
  if (confirm("Clear all chat history?")) {
    localStorage.removeItem("saved-api-chats");
    loadSavedChatHistory();
    currentUserMessage = null;
  }
};

// Suggestions
suggestionItems.forEach((item) => {
  item.onclick = () => {
    currentUserMessage = item.querySelector(".suggests__item-text").innerText;
    handleOutgoingMessage();
  };
});

// Submit event
messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  handleOutgoingMessage();
});

// Start
loadSavedChatHistory();
