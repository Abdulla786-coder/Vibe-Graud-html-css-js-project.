# VibeGuard – AI Code Security Auditor

VibeGuard is a web-based code security auditing tool built with HTML, CSS, and JavaScript. It analyzes AI-generated code for security vulnerabilities, logic hallucinations, and OWASP Top 10 issues, providing a quality score and refactoring roadmap.

## Features

- **Static Analysis (SAST)**: Detects common security vulnerabilities
- **AI Audit Integration**: Uses OpenAI or Claude for advanced logic analysis
- **Scoring System**: Provides a security score with detailed breakdown
- **Refactoring Roadmap**: Step-by-step fix suggestions
- **Scan History**: Stores all past scans (now with database support)

## Database Integration

VibeGuard now includes a backend database to persistently store scan results. The database automatically saves all scan data and syncs with the frontend.

### Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Backend Server**:
   ```bash
   npm start
   ```
   The server runs on `http://localhost:5000` and uses SQLite for data storage.

3. **Serve the Frontend**:
   Open `index.html` in your browser, or use a local server:
   ```bash
   python -m http.server 3000
   ```
   Then visit `http://localhost:3000`

### API Endpoints

- `GET /api/scans` - Retrieve all scan history
- `POST /api/scans` - Save a new scan result
- `DELETE /api/scans` - Clear all scan history

## AI Audit Integration

The application can perform an AI-powered logic audit of your code using external APIs. It currently supports:

- **OpenAI** (`sk-` prefix) using GPT-4o/GPT-4o-mini models
- **Anthropic Claude** (`claude-` prefix) via the Claude API

For secure operation, the recommended setup is server-side only. Set your key in environment variables and do not commit it.

### Backend AI configuration

1. Create a `.env` file or export environment variables securely.
2. Set one of these:
   - `AI_API_KEY=sk-...` for OpenAI or `AI_API_KEY=claude-...` for Claude
   - `OPENAI_API_KEY=sk-...`
   - `CLAUDE_API_KEY=claude-...`
3. Optional: specify provider explicitly:
   - `AI_PROVIDER=openai`
   - `AI_PROVIDER=claude`

The backend proxy routes are:

- `POST /api/audit` – runs a logic audit on submitted code
- `POST /api/chat` – supports chatbot queries through the same server-side key

If you want to use a temporary key in the browser, it is now session-only and never stored in localStorage.

## Chatbot

A simple AI chatbot is available on the landing page. It uses the same API key to answer general questions and help you explore features. No setup required beyond saving your OpenAI or Claude key.
