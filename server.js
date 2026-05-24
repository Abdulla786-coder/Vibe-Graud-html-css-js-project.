require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const AI_PROVIDER = (process.env.AI_PROVIDER || 'openai').toLowerCase();
//const AI_API_KEY = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.CLAUDE_API_KEY;
const AI_API_KEY = process.env.AI_API_KEY;
const allowedProviders = ['openai', 'claude'];

function isOpenAIKey(key) {
  return typeof key === 'string' && key.startsWith('sk-');
}

function isClaudeKey(key) {
  return typeof key === 'string' && key.toLowerCase().startsWith('claude-');
}

function truncateCode(code) {
  if (typeof code !== 'string') return '';
  return code.length > 8000 ? code.slice(0, 8000) + '\n// ... (truncated)' : code;
}

function chooseProvider(apiKey, overrideProvider) {
  if (overrideProvider && allowedProviders.includes(overrideProvider)) {
    return overrideProvider;
  }
  if (isOpenAIKey(apiKey)) return 'openai';
  if (isClaudeKey(apiKey)) return 'claude';
  return AI_PROVIDER;
}

function getEffectiveApiKey(clientKey) {
  if (typeof clientKey === 'string' && clientKey.trim().length > 0) {
    return clientKey.trim();
  }
  return AI_API_KEY;
}

async function callOpenAI(code, language, apiKey) {
  const prompt = `You are VibeGuard's AI Security Auditor. Analyze this ${language} code for logic hallucinations and structural issues:\n\n` +
    `\`${language}\`\n${truncateCode(code)}\n\`${language}\``;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are VibeGuard\'s AI Security Auditor, specialized in detecting logic hallucinations and structural issues in AI-generated code.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error?.message || response.statusText);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callClaude(code, language, apiKey) {
  const prompt = `You are VibeGuard's AI Security Auditor. Analyze this ${language} code for logic hallucinations and structural issues in AI-generated code:\n\n` +
    `\`${language}\`\n${truncateCode(code)}\n\`${language}\``;
  const response = await fetch('https://api.anthropic.com/v1/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      model: 'claude-2.1',
      prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
      max_tokens_to_sample: 2000,
      temperature: 0.1,
      stop_sequences: ['\n\nHuman:'],
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || response.statusText);
  }

  const data = await response.json();
  return data.completion || data.output || '';
}

function parseJsonArray(content) {
  if (typeof content !== 'string') return [];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
    const key = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
    return key ? parsed[key] : [];
  } catch {
    return [];
  }
}

async function runAIAudit(code, language, apiKey, providerOverride) {
  const effectiveKey = getEffectiveApiKey(apiKey);
  if (!effectiveKey) {
    throw new Error('AI API key not configured on backend. Set AI_API_KEY, OPENAI_API_KEY, or CLAUDE_API_KEY.');
  }

  const provider = chooseProvider(effectiveKey, providerOverride);
  const text = provider === 'claude'
    ? await callClaude(code, language, effectiveKey)
    : await callOpenAI(code, language, effectiveKey);

  return parseJsonArray(text);
}

async function sendAIChat(apiKey, text, providerOverride) {
  const effectiveKey = getEffectiveApiKey(apiKey);
  if (!effectiveKey) {
    throw new Error('AI API key not configured on backend. Set AI_API_KEY, OPENAI_API_KEY, or CLAUDE_API_KEY.');
  }

  const provider = chooseProvider(effectiveKey, providerOverride);
  if (provider === 'claude') {
    const response = await fetch('https://api.anthropic.com/v1/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': effectiveKey,
      },
      body: JSON.stringify({
        model: 'claude-2.1',
        prompt: `\n\nHuman: ${text}\n\nAssistant:`,
        max_tokens_to_sample: 300,
        temperature: 0.7,
        stop_sequences: ['\n\nHuman:'],
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || response.statusText);
    }

    const data = await response.json();
    return data.completion || data.output || '';
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${effectiveKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: text },
      ],
      temperature: 0.7,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error?.message || response.statusText);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// Initialize SQLite database
const dbPath = path.join(__dirname, 'vibeguard.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    language TEXT NOT NULL,
    vulnerabilities TEXT,
    score REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(cors());
app.use(express.json());

app.post('/api/scans', (req, res) => {
  try {
    const { code, language, vulnerabilities, score } = req.body;
    const stmt = db.prepare(`
      INSERT INTO scans (code, language, vulnerabilities, score)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(code, language, JSON.stringify(vulnerabilities || []), score);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/status', (req, res) => {
  res.json({
    available: !!AI_API_KEY,
    provider: AI_PROVIDER,
    configured: !!AI_API_KEY,
    message: AI_API_KEY ? 'Backend AI is configured.' : 'AI API key is not configured on the backend.',
  });
});

app.get('/api/scans', (req, res) => {
  try {
    const stmt = db.prepare(`SELECT * FROM scans ORDER BY timestamp DESC`);
    const scans = stmt.all().map(scan => ({
      ...scan,
      vulnerabilities: JSON.parse(scan.vulnerabilities || '[]'),
    }));
    res.json(scans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/scans', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM scans');
    stmt.run();
    res.json({ message: 'All scans deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/audit', async (req, res) => {
  const { code, language, apiKey, provider } = req.body;
  if (!code || typeof code !== 'string' || code.trim().length < 5) {
    return res.status(400).json({ error: 'Invalid code payload.' });
  }
  if (!language || typeof language !== 'string') {
    return res.status(400).json({ error: 'Language is required.' });
  }

  try {
    const findings = await runAIAudit(code, language, apiKey, provider);
    res.json({ findings });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.post('/api/chat', async (req, res) => {
  const { text, apiKey, provider } = req.body;
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Text is required for chat.' });
  }

  try {
    const reply = await sendAIChat(apiKey, text, provider);
    res.json({ reply });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});