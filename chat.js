// chat.js (clean and clear)
(function() {
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const messagesDiv = document.getElementById('chatMessages');
  const newChatBtn = document.getElementById('newChatBtn');
  let sessionId = null;

  function appendMessage(text, isUser = false) {
    const p = document.createElement('p');
    p.textContent = isUser ? `You: ${text}` : `HustleSynth: ${text}`;
    p.className = isUser
      ? 'text-gray-900 mb-2 font-semibold'
      : 'text-gray-800 mb-2 italic';
    messagesDiv.appendChild(p);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // Initial greeting
  messagesDiv.innerHTML = `<p class="text-gray-800 mb-2">Hello! I'm HustleSynth AI. How can I help you boost your productivity today? 🚀</p>`;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    appendMessage(message, true);
    input.value = '';

    appendMessage('...', false);
    const loading = messagesDiv.lastChild;

    try {
      const response = await fetch('/api/chat', {  // <-- make sure this path matches your backend endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId })
      });

      if (!response.ok) throw new Error(`Status ${response.status} ${response.statusText}`);

      const data = await response.json();

      messagesDiv.removeChild(loading);

      if (data.response) {
        appendMessage(data.response, false);
        sessionId = data.sessionId;
      } else {
        appendMessage('Oops, no response from HustleSynth. Try again later.', false);
      }
    } catch (err) {
      if (messagesDiv.lastChild === loading) messagesDiv.removeChild(loading);
      appendMessage('Error connecting to HustleSynth. Please try again.', false);
      console.error('Chat error:', err);
    }

    input.focus();
  });

  newChatBtn.addEventListener('click', () => {
    sessionId = null;
    messagesDiv.innerHTML = `<p class="text-gray-800 mb-2">Hello! I'm HustleSynth AI. How can I help you boost your productivity today? 🚀</p>`;
    input.focus();
  });
})();
