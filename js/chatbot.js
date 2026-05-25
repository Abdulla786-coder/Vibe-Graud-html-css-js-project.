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
      appendMsg('⏳ thinking…', 'bot');

      // If the user pasted a code block (```lang\ncode```), run local SAST if available
      const codeBlock = text.match(/```(\w*)\n([\s\S]*?)```/);
      if (codeBlock) {
        const lang = (codeBlock[1] || 'javascript').toLowerCase();
        const code = codeBlock[2];
        try {
          if (typeof runSAST === 'function') {
            const findings = runSAST(code, lang);
            bodyEl.lastChild.textContent = summarizeFindings(findings, lang);
            // Try sending to server in background for deeper AI analysis (best-effort)
            sendAIChat(undefined, text).catch(() => {});
            return;
          }
        } catch (e) {
          console.warn('Local SAST failed:', e.message);
        }
      }

      try {
        const reply = await sendAIChat(undefined, text);
        bodyEl.lastChild.textContent = reply || '(no response)';
      } catch (err) {
        console.warn('Chat API failed:', err.message);
        // If the user included code (but runSAST wasn't available earlier), try a lightweight local heuristic
        if (codeBlock && typeof runSAST !== 'function') {
          bodyEl.lastChild.textContent = 'Local analysis not available on this page. Open the Scanner page for full offline checks.';
        } else {
          bodyEl.lastChild.textContent = localChatReply(text);
        }
      }
    }

    function localChatReply(text) {
      const low = text.toLowerCase();

      if (/ai audit|audit unavailable|failed to fetch|server/.test(low)) {
        return 'I can still help! Start a scan or enter your AI API key if you want the server-side audit. If the backend is unavailable, I will provide local security advice and optimization tips based on your code.';
      }
      if (/optimi|refactor|clean|simplify|better code|performance/.test(low)) {
        return 'For better performance and safety, avoid eval/exec, use HTTPS, sanitize user input, and prefer secure random generation. Paste your code into the scanner for a detailed audit.';
      }
      if (/js|javascript|python|html|css|sql|bash/.test(low) && /help|issue|problem|bug/.test(low)) {
        return 'I can analyze code security patterns, find vulnerabilities, and suggest fixes. Give me a code snippet or ask about specific security issues.';
      }
      if (/vibeguard|scan|security|sast|ai/.test(low)) {
        return 'VibeGuard checks your code for vulnerabilities and logic issues. Use the scanner page to paste code, and I can explain the results or suggest improvements.';
      }
      if (/hello|hi|hey/.test(low)) {
        return 'Hello! I am VibeGuard. Ask me about code security, how to fix vulnerabilities, or how to optimize your code.';
      }
      return 'I am VibeGuard. I can answer questions about code security, vulnerabilities, and optimization. Try asking “How do I fix this code?” or “What security issues do I have?”.';
    }

    function summarizeFindings(findings, language) {
      if (!findings || findings.length === 0) return `No issues found by the local SAST for ${language}. For deeper, LLM-driven checks, add a session API key on the Scanner page or configure the server key.`;
      const counts = findings.reduce((acc, f) => { acc[f.severity] = (acc[f.severity]||0)+1; return acc; }, {});
      const top = findings.slice(0, 3).map((f,i)=>`${i+1}. ${f.name} (line ${f.line}) — ${f.severity}. Fix: ${f.fix.split('\n')[0]}`).join('\n');
      return `Local SAST found ${findings.length} issue(s) in ${language}.\n` +
        Object.entries(counts).map(([k,v])=>`${k}: ${v}`).join(' · ') +
        `\nTop findings:\n${top}\n\nOpen the Scanner page for the full report and roadmap.`;
    }

    sendBtn.addEventListener('click', handleSend);
    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleSend();
    });
  });
})();