// chat.js

(() => {
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');
  const newChatBtn = document.getElementById('newChatBtn');

  let sessionId = null; // Keeps track of chat session

  // Append message to chat container
  function appendMessage(text, isUser = false) {
    const p = document.createElement('p');
    p.textContent = isUser ? `You: ${text}` : `HustleSynth: ${text}`;
    p.className = isUser
      ? 'text-gray-900 mb-2 font-semibold'
      : 'text-gray-800 mb-2 italic';
    chatMessages.appendChild(p);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Send message handler
  async function sendMessage(message) {
    appendMessage(message, true);
    chatInput.value = '';

    // Show loading indicator
    appendMessage('...', false);
    const loadingMsg = chatMessages.lastChild;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'content-type': 'application/json',
          'cache-control': 'no-cache',
          'pragma': 'no-cache',
        },
        body: JSON.stringify({ message, sessionId }),
        mode: 'cors',
      });

      const data = await response.json();

      chatMessages.removeChild(loadingMsg);

      if (data && data.response) {
        appendMessage(data.response, false);
        sessionId = data.sessionId; // keep session alive
      } else {
        appendMessage('Oops, no response from HustleSynth. Try again later.', false);
      }
    } catch (error) {
      chatMessages.removeChild(loadingMsg);
      appendMessage('Error connecting to HustleSynth. Please try again.', false);
      console.error('Chat fetch error:', error);
    }
  }

  // Event listener for form submit
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;
    sendMessage(message);
  });

  // Event listener for New Chat button
  newChatBtn.addEventListener('click', () => {
    sessionId = null;
    chatMessages.innerHTML = `<p class="text-gray-800">Hello! I'm HustleSynth AI. How can I help you boost your productivity today? 🚀</p>`;
    chatInput.focus();
  });
})();
