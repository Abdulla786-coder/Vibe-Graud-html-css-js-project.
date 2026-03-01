// Simple floating chatbot widget for the landing page
// relies on sendAIChat(apiKey, text) defined in openai-audit.js

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    // create DOM elements
    const container = document.createElement('div');
    container.className = 'chatbot-container';
    container.innerHTML = `
      <div class="chatbot-header">Chat with VibeGuard</div>
      <div class="chatbot-body" id="chat-body"></div>
      <div class="chatbot-input">
        <input id="chat-input" placeholder="Ask me anything..." autocomplete="off" />
        <button id="chat-send">Send</button>
      </div>
    `;
    document.body.appendChild(container);

    const bodyEl = document.getElementById('chat-body');
    const inputEl = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');

    function appendMsg(text, cls) {
      const msg = document.createElement('div');
      msg.className = 'chatbot-message ' + cls;
      msg.textContent = text;
      bodyEl.appendChild(msg);
      bodyEl.scrollTop = bodyEl.scrollHeight;
    }

    async function handleSend() {
      const text = inputEl.value.trim();
      if (!text) return;
      appendMsg(text, 'user');
      inputEl.value = '';
      const apiKey = localStorage.getItem('vg_api_key') || '';
      if (!apiKey) {
        appendMsg('🔒 No API key set. Go to Scanner and save one.', 'bot');
        return;
      }
      appendMsg('⏳ thinking…', 'bot');
      try {
        const reply = await sendAIChat(apiKey, text);
        bodyEl.lastChild.textContent = reply || '(no response)';
      } catch (err) {
        bodyEl.lastChild.textContent = 'Error: ' + err.message;
      }
    }

    sendBtn.addEventListener('click', handleSend);
    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleSend();
    });
  });
})();