/**
 * VibeGuard – Scan Orchestrator
 * Controls the full scan flow from the scan.html page
 */

// ── Samples ──
const SAMPLES = {
  js: `// AI-Generated JavaScript – Deliberately Vulnerable
const password = "admin123";
const apiKey = "sk-proj-abc123secretkey456"; // or claude-yourkey
const userId = req.params.id;

// SQL Injection
const query = "SELECT * FROM users WHERE id=" + userId;
db.execute(query);

// XSS vulnerability
document.getElementById("output").innerHTML = userInput;

// Dangerous eval
eval(userInput);

// Insecure random for token
const token = Math.random().toString(36);

// External HTTP (not HTTPS)
fetch("http://api.example.com/data");

// Debug logs with sensitive data
console.log("User data:", userData);
console.log("Token:", token);

// TODO: add proper authentication
// FIXME: this loop might be infinite
let i = 0;
while (true) {
  if (someCondition) break;
  i++;
}`,

  py: `# AI-Generated Python – Deliberately Vulnerable
import pickle
import os
import hashlib

DEBUG = True
password = "supersecret123"
api_key = "sk-abc123xyz"  # or claude-yourkey

# Shell injection
user_input = input("Enter filename: ")
os.system("cat " + user_input)

# Pickle deserialization from untrusted source
data = pickle.loads(user_data_from_network)

# Weak hashing
hashed = hashlib.md5(password.encode()).hexdigest()

# SQL injection
query = "SELECT * FROM users WHERE name='" + username + "'"
cursor.execute(query)

# HTTP instead of HTTPS
import urllib.request
urllib.request.urlopen("http://api.example.com/endpoint")

# Broad exception catch
try:
    risky_operation()
except:
    pass

# FIXME: need to validate input here
# TODO: add rate limiting`,

  clean: `// Clean, Secure JavaScript Example
import { randomBytes } from 'crypto';
import { hash } from 'bcrypt';

// Environment variables for secrets
const apiKey = process.env.API_KEY;
const dbPassword = process.env.DB_PASSWORD;

// Parameterized query – no SQL injection
async function getUserById(userId) {
  const result = await db.query(
    'SELECT id, name, email FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] ?? null;
}

// Sanitized output – no XSS
function displayMessage(message) {
  const el = document.getElementById('output');
  el.textContent = message; // Safe: textContent not innerHTML
}

// Cryptographically secure token generation
function generateToken() {
  return randomBytes(32).toString('hex');
}

// Proper password hashing
async function hashPassword(plaintext) {
  return hash(plaintext, 12); // bcrypt with cost factor 12
}

// HTTPS endpoint
const ENDPOINT = 'https://api.example.com/data';

export { getUserById, displayMessage, generateToken, hashPassword };`,
  simple: `// Simple JavaScript Sample
const message = 'Hello, VibeGuard!';

function greet(name) {
  return \`Hello, ${name}!\`;
}

console.log(greet('Tester'));`,
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>VibeGuard Demo</title>
</head>
<body>
  <button id="greet-btn">Click me</button>
  <script>
    document.getElementById('greet-btn').addEventListener('click', () => {
      alert('Hello from VibeGuard!');
    });
  </script>
</body>
</html>`,
  css: `/* Simple CSS sample */
:root {
  --main-color: #4f46e5;
}

body {
  margin: 0;
  font-family: Inter, sans-serif;
  background: #f8fafc;
  color: #0f172a;
}

button {
  background: var(--main-color);
  color: white;
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: 0.75rem;
}

button:hover {
  filter: brightness(1.05);
}
`,
  ts: `// TypeScript sample
interface User {
  id: number;
  name: string;
}

function getUserName(user: User): string {
  return user.name;
}

const user: User = { id: 1, name: 'VibeGuard' };
console.log(getUserName(user));`,
  sql: `-- SQL sample
SELECT id, username, email
FROM users
WHERE email LIKE '%@example.com';`,
  bash: `#!/bin/bash
echo "Starting VibeGuard sample"
read -p "Enter your name: " name
echo "Hello, $name"
`,
};

// ── DOM References ──
const codeInput = document.getElementById('code-input');
const langSelect = document.getElementById('lang-select');
const fileInput = document.getElementById('file-input');
const lineCount = document.getElementById('line-count');
const analyzeBtn = document.getElementById('analyze-btn');
const btnText = document.getElementById('btn-text');
const btnIcon = document.getElementById('btn-icon');
const scanProgress = document.getElementById('scan-progress');
const apiKeyInput = document.getElementById('api-key-input');
const saveApiBtn = document.getElementById('save-api-btn');
const apiStatus = document.getElementById('api-status');
const editorBadge = document.getElementById('editor-lang-badge');

// ── Session-only API key support ──
let sessionApiKey = '';
let serverAIAvailable = false;
const SERVER_API = (typeof API_BASE_URL !== 'undefined' && API_BASE_URL) ? API_BASE_URL : 'http://localhost:5000';

function safeQuery(id) {
  return document.getElementById(id);
}

function initBindings() {
  // Re-bind DOM elements if they weren't available at top-level
  if (!window._vg_initialized) {
    window._vg_initialized = true;
    console.log('[VibeGuard] Initializing scanner bindings');
    // Reassign common globals if null
    if (!codeInput) codeInput = safeQuery('code-input');
    if (!langSelect) langSelect = safeQuery('lang-select');
    if (!fileInput) fileInput = safeQuery('file-input');
    if (!lineCount) lineCount = safeQuery('line-count');
    if (!analyzeBtn) analyzeBtn = safeQuery('analyze-btn');
    if (!btnText) btnText = safeQuery('btn-text');
    if (!btnIcon) btnIcon = safeQuery('btn-icon');
    if (!scanProgress) scanProgress = safeQuery('scan-progress');
    if (!apiKeyInput) apiKeyInput = safeQuery('api-key-input');
    if (!saveApiBtn) saveApiBtn = safeQuery('save-api-btn');
    if (!apiStatus) apiStatus = safeQuery('api-status');
    if (!editorBadge) editorBadge = safeQuery('editor-lang-badge');

    // Wire sample buttons immediately
    document.querySelectorAll('[data-sample]').forEach(btn => {
      btn.removeEventListener('click', sampleListener);
      btn.addEventListener('click', sampleListener);
    });

    // analyze button binding is declared later in this file; no duplicate binding here
  }
}

function sampleListener(e) { const t = e.currentTarget.dataset.sample; loadSample(t); }

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(initBindings, 0);
} else {
  document.addEventListener('DOMContentLoaded', initBindings);
}

function getLineNumber(code, regex) {
  const match = regex.exec(code);
  if (!match) return 1;
  return code.substring(0, match.index).split('\n').length;
}

function buildFinding({ id, name, severity, owasp, description, fix, snippet, line, source }) {
  return {
    id: id || `LOCAL_AI_${Math.random().toString(36).slice(2, 10)}`,
    name,
    severity,
    owasp: owasp || 'A06:2023 – Vulnerable and Outdated Components',
    line: line || 1,
    snippet: snippet || '',
    description,
    fix,
    source: source || 'AI Fallback',
  };
}

function generateLocalAIFindings(code, language) {
  const findings = [];
  const add = (finding) => findings.push(buildFinding(finding));
  const lower = code.toLowerCase();

  if (/\beval\s*\(|\bexec\s*\(|\bnew Function\s*\(/.test(code)) {
    add({
      name: 'Dynamic Code Execution',
      severity: 'High',
      owasp: 'A03:2021 – Injection',
      description: 'This code uses dynamic execution patterns that can execute attacker-controlled text. Refactor to avoid eval/exec and use safe parsing or direct logic.',
      fix: 'Replace eval()/exec()/new Function() with explicit functions, parser-based logic, or template rendering libraries that do not execute raw strings.',
      snippet: code.match(/.*(?:eval\s*\(|exec\s*\(|new Function\s*\().*/)?.[0] || '',
      line: getLineNumber(code, /\beval\s*\(|\bexec\s*\(|\bnew Function\s*\(/),
    });
  }

  if (/\.innerHTML\s*=/.test(code)) {
    add({
      name: 'Unsafe DOM Injection',
      severity: 'High',
      owasp: 'A03:2021 – Injection',
      description: 'Assigning to innerHTML can inject attacker-provided HTML or script into the page. This is a common XSS vector.',
      fix: 'Use textContent for plain text, or sanitize values before assigning them to innerHTML.',
      snippet: code.match(/.*\.innerHTML\s*=.*/)?.[0] || '',
      line: getLineNumber(code, /\.innerHTML\s*=/),
    });
  }

  if (/http:\/\//.test(code) && !/http:\/\/localhost|http:\/\/127\.0\.0\.1/.test(code)) {
    add({
      name: 'Insecure HTTP Usage',
      severity: 'Medium',
      owasp: 'A02:2021 – Cryptographic Failures',
      description: 'This code connects over HTTP instead of HTTPS, exposing data to eavesdroppers and tampering.',
      fix: 'Switch all external requests to HTTPS and enforce TLS in production.',
      snippet: code.match(/.*http:\/\/.*$/m)?.[0] || '',
      line: getLineNumber(code, /http:\/\//),
    });
  }

  if (/\bMath\.random\s*\(|\brandom\.random\s*\(|\brandom\.randint\b/.test(code)) {
    add({
      name: 'Weak Random Number Usage',
      severity: 'Medium',
      owasp: 'A02:2021 – Cryptographic Failures',
      description: 'Math.random() and similar functions are not safe for tokens, passwords, or cryptographic operations.',
      fix: 'Use crypto.getRandomValues(), crypto.randomBytes(), or Python secrets for security-sensitive randomness.',
      snippet: code.match(/.*(?:Math\.random\s*\(|random\.random\s*\(|random\.randint\b).*/)?.[0] || '',
      line: getLineNumber(code, /Math\.random\s*\(|random\.random\s*\(|random\.randint\b/),
    });
  }

  if (/\bconsole\.log\s*\(/.test(code)) {
    add({
      name: 'Debug Logging Left In Code',
      severity: 'Low',
      owasp: 'A09:2021 – Security Logging and Monitoring Failures',
      description: 'console.log() calls can leak sensitive data in production and should be replaced with structured logging when appropriate.',
      fix: 'Remove debug logs or wrap them behind a development-only logger with environment-based log levels.',
      snippet: code.match(/.*console\.log\s*\(.*/)?.[0] || '',
      line: getLineNumber(code, /console\.log\s*\()/),
    });
  }

  if (/\bTODO\b|\bFIXME\b|\bHACK\b|\bBUG\b/.test(code)) {
    add({
      name: 'Unresolved TODO / FIXME Comments',
      severity: 'Info',
      owasp: 'A04:2021 – Insecure Design',
      description: 'Comments like TODO or FIXME indicate incomplete security or stability work that should be resolved before release.',
      fix: 'Review and resolve these notes, or move them into your issue tracker so production code stays clean.',
      snippet: code.match(/.*\b(?:TODO|FIXME|HACK|BUG)\b.*/)?.[0] || '',
      line: getLineNumber(code, /\bTODO\b|\bFIXME\b|\bHACK\b|\bBUG\b/),
    });
  }

  if (findings.length === 0) {
    add({
      name: 'Code Review Passed',
      severity: 'Info',
      owasp: 'N/A',
      description: 'No local heuristic issues were detected. Your code looks structurally sound based on the available patterns.',
      fix: 'Continue using secure data handling, avoid dynamic execution, and keep dependencies up to date.',
      snippet: '',
      line: 1,
    });
  }

  return findings;
}

async function refreshAIStatus() {
  try {
    const status = await checkAIStatus();
    serverAIAvailable = status.available;
  } catch {
    serverAIAvailable = false;
  }
  updateApiStatus(sessionApiKey);
}

function updateApiStatus(key) {
  if (key && key.length > 0) {
    apiStatus.textContent = '✅ Session key loaded — AI logic audit will use this key for this session only';
    apiStatus.className = 'api-status ok';
  } else if (serverAIAvailable) {
    apiStatus.textContent = '✅ Backend AI is available — AI audit will run on the server';
    apiStatus.className = 'api-status ok';
  } else {
    apiStatus.textContent = '⚠ No AI key configured — scan will use SAST-only mode';
    apiStatus.className = 'api-status missing';
  }
}

saveApiBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  sessionApiKey = key;
  apiKeyInput.value = '';
  updateApiStatus(key);
  showToast(key ? '✅ Session API key loaded. It is not stored locally.' : '✅ AI session key cleared.');
});

refreshAIStatus();

// ── Language selector ──
langSelect.addEventListener('change', () => {
  editorBadge.textContent = langSelect.value;
});

// ── Line counter ──
codeInput.addEventListener('input', () => {
  const lines = codeInput.value.split('\n').length;
  lineCount.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;
});

// ── File Upload ──
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  const langMap = {
    js: 'javascript',
    ts: 'typescript',
    jsx: 'javascript',
    tsx: 'typescript',
    py: 'python',
    html: 'html',
    css: 'css',
    sql: 'sql',
    sh: 'bash',
  };
  if (langMap[ext]) {
    langSelect.value = langMap[ext];
    editorBadge.textContent = langMap[ext];
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    codeInput.value = ev.target.result;
    const lines = codeInput.value.split('\n').length;
    lineCount.textContent = `${lines} lines`;
  };
  reader.readAsText(file);
});

// ── Load sample ──
function loadSample(type) {
  const sample = SAMPLES[type];
  if (!sample) return;
  codeInput.value = sample;
  const langMap = {
    js: 'javascript',
    py: 'python',
    clean: 'javascript',
    simple: 'javascript',
    html: 'html',
    css: 'css',
    ts: 'typescript',
    sql: 'sql',
    bash: 'bash',
  };
  const lang = langMap[type] || 'javascript';
  langSelect.value = lang;
  editorBadge.textContent = lang;
  lineCount.textContent = `${sample.split('\n').length} lines`;
}

// Wire sample buttons that use data-sample attributes
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-sample]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const t = btn.dataset.sample;
      loadSample(t);
    });
  });
});

// ── Step helpers ──
function setStep(id, state) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'progress-step ' + state;
  const icon = el.querySelector('.step-icon');
  if (state === 'done') icon.textContent = '✓';
  else if (state === 'active') icon.textContent = '◷';
  else icon.textContent = '◷';
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Main Analyze ──
analyzeBtn.addEventListener('click', async () => {
  const code = codeInput.value.trim();
  if (!code || code.length < 5) {
    showToast('⚠ Please enter some code first.', true);
    return;
  }

  const language = langSelect.value;

  // UI → loading
  analyzeBtn.disabled = true;
  btnText.textContent = 'Scanning…';
  btnIcon.textContent = '⏳';
  scanProgress.classList.add('visible');
  ['step-sast','step-ai','step-score','step-road'].forEach(s => setStep(s, ''));

  try {
    // Step 1 – SAST
    setStep('step-sast', 'active');
    await delay(500);
    const sastFindings = runSAST(code, language);
    setStep('step-sast', 'done');

    // Step 2 – AI Audit (server-side proxy or local fallback)
    setStep('step-ai', 'active');
    let aiFindings = [];
    let aiEnabled = false;
    let aiFallback = false;
    try {
      aiFindings = await runAIAudit(code, language, sessionApiKey);
      aiEnabled = true;
    } catch (err) {
      console.warn('AI audit unavailable, falling back to local heuristic analysis:', err.message);
      showToast(`⚠ AI audit unavailable: ${err.message}. Using local fallback.`, true);
      aiFindings = generateLocalAIFindings(code, language);
      aiFallback = true;
    }
    setStep('step-ai', 'done');

    // Step 3 – Score
    setStep('step-score', 'active');
    await delay(400);
    const allFindings = [...sastFindings, ...aiFindings];
    const scoreData = calculateScore(allFindings);
    setStep('step-score', 'done');

    // Step 4 – Roadmap
    setStep('step-road', 'active');
    await delay(400);
    const roadmap = generateRoadmap(allFindings, scoreData.score, language);
    setStep('step-road', 'done');

    // Build result object
    const result = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      language,
      code: code.substring(0, 2000),
      findings: allFindings,
      score: scoreData.score,
      breakdown: scoreData.breakdown,
      grade: scoreData.grade,
      gradeColor: scoreData.gradeColor,
      gradeEmoji: scoreData.gradeEmoji,
      roadmap,
      aiEnabled: aiEnabled && !aiFallback,
      aiFallback,
      lines: code.split('\n').length,
    };

    // Save to history
    const history = JSON.parse(localStorage.getItem('vg_history') || '[]');
    history.push(result);
    if (history.length > 50) history.shift(); // cap at 50
    localStorage.setItem('vg_history', JSON.stringify(history));

    // Send to backend database (best-effort)
    try {
      await fetch(`${SERVER_API}/api/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: result.code,
          language: result.language,
          vulnerabilities: result.findings.map(f => ({
            type: f.type || f.id || f.name,
            severity: f.severity,
            description: f.description,
            line: f.line
          })),
          score: result.score
        })
      });
    } catch (dbError) {
      console.warn('Failed to save to database:', dbError);
      // Continue anyway, localStorage still works
    }

    // Save as active result and navigate
    localStorage.setItem('vg_active_result', JSON.stringify(result));
    await delay(300);
    window.location.href = 'results.html';

  } catch (err) {
    console.error(err);
    showToast('❌ Scan failed: ' + err.message, true);
    analyzeBtn.disabled = false;
    btnText.textContent = 'Analyze Code';
    btnIcon.textContent = '🔍';
    scanProgress.classList.remove('visible');
  }
});

// ── Toast ──
function showToast(message, isError = false) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast' + (isError ? ' error' : '');
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
