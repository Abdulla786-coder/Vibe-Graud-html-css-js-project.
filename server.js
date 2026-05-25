require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const AI_PROVIDER = (process.env.AI_PROVIDER || 'openai').toLowerCase();
const AI_API_KEY = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.CLAUDE_API_KEY;
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

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create all tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  );

  CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    code TEXT NOT NULL,
    language TEXT NOT NULL,
    vulnerabilities TEXT,
    score REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS scan_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    scan_id INTEGER,
    code_snippet TEXT,
    language TEXT NOT NULL,
    vulnerabilities_count INTEGER DEFAULT 0,
    security_score REAL NOT NULL,
    scan_date DATE NOT NULL,
    scan_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'completed',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS daily_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    scan_date DATE NOT NULL,
    total_scans INTEGER DEFAULT 0,
    avg_score REAL DEFAULT 0,
    high_severity_count INTEGER DEFAULT 0,
    medium_severity_count INTEGER DEFAULT 0,
    low_severity_count INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, scan_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
  CREATE INDEX IF NOT EXISTS idx_scans_timestamp ON scans(timestamp);
  CREATE INDEX IF NOT EXISTS idx_scan_history_user_id ON scan_history(user_id);
  CREATE INDEX IF NOT EXISTS idx_scan_history_date ON scan_history(scan_date);
  CREATE INDEX IF NOT EXISTS idx_daily_stats_user_id ON daily_stats(user_id);
  CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(scan_date);
`);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── User Authentication Endpoints ──

// Register a new user
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    const stmt = db.prepare(`
      INSERT INTO users (username, email, password)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(username, email, password);
    res.status(201).json({ 
      id: result.lastInsertRowid,
      username,
      email,
      message: 'User registered successfully'
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: 'Username or email already exists.' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Login user
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const stmt = db.prepare(`
      SELECT id, username, email FROM users WHERE username = ? AND password = ?
    `);
    
    const user = stmt.get(username, password);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Update last login
    const updateStmt = db.prepare(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`);
    updateStmt.run(user.id);

    res.json({ 
      id: user.id,
      username: user.username,
      email: user.email,
      message: 'Login successful'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Scan Endpoints ──

// Create a new scan and record in history
app.post('/api/scans', (req, res) => {
  try {
    const { code, language, vulnerabilities, score, user_id } = req.body;
    
    if (!code || !language || score === undefined) {
      return res.status(400).json({ error: 'Code, language, and score are required.' });
    }

    // Insert into scans table
    const scanStmt = db.prepare(`
      INSERT INTO scans (user_id, code, language, vulnerabilities, score)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const scanResult = scanStmt.run(user_id || null, code, language, JSON.stringify(vulnerabilities || []), score);
    const scanId = scanResult.lastInsertRowid;

    // Insert into scan_history table
    const historyStmt = db.prepare(`
      INSERT INTO scan_history (user_id, scan_id, code_snippet, language, vulnerabilities_count, security_score, scan_date)
      VALUES (?, ?, ?, ?, ?, ?, DATE('now'))
    `);
    
    const vulnerabilityCount = Array.isArray(vulnerabilities) ? vulnerabilities.length : 0;
    historyStmt.run(user_id || null, scanId, code.substring(0, 500), language, vulnerabilityCount, score);

    // Update daily stats
    if (user_id) {
      updateDailyStats(user_id, vulnerabilities, score);
    }

    res.status(201).json({ 
      id: scanId,
      message: 'Scan recorded successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to update daily stats
function updateDailyStats(userId, vulnerabilities, score) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if daily stat exists
    const checkStmt = db.prepare(`
      SELECT id, total_scans, avg_score FROM daily_stats WHERE user_id = ? AND scan_date = ?
    `);
    const existingStat = checkStmt.get(userId, today);

    // Count vulnerabilities by severity (assuming vulnerabilities have severity property)
    let highCount = 0, mediumCount = 0, lowCount = 0;
    if (Array.isArray(vulnerabilities)) {
      vulnerabilities.forEach(v => {
        if (v.severity === 'high') highCount++;
        else if (v.severity === 'medium') mediumCount++;
        else if (v.severity === 'low') lowCount++;
      });
    }

    if (existingStat) {
      // Update existing record
      const newTotal = existingStat.total_scans + 1;
      const newAvgScore = (existingStat.avg_score * existingStat.total_scans + score) / newTotal;
      
      const updateStmt = db.prepare(`
        UPDATE daily_stats 
        SET total_scans = ?, avg_score = ?, high_severity_count = high_severity_count + ?,
            medium_severity_count = medium_severity_count + ?, low_severity_count = low_severity_count + ?,
            last_updated = CURRENT_TIMESTAMP
        WHERE user_id = ? AND scan_date = ?
      `);
      updateStmt.run(newTotal, newAvgScore, highCount, mediumCount, lowCount, userId, today);
    } else {
      // Create new record
      const insertStmt = db.prepare(`
        INSERT INTO daily_stats (user_id, scan_date, total_scans, avg_score, high_severity_count, medium_severity_count, low_severity_count)
        VALUES (?, ?, 1, ?, ?, ?, ?)
      `);
      insertStmt.run(userId, today, score, highCount, mediumCount, lowCount);
    }
  } catch (error) {
    console.error('Error updating daily stats:', error);
  }
}

// Get all scans (with optional user filtering)
app.get('/api/scans', (req, res) => {
  try {
    const { user_id } = req.query;
    let stmt;
    
    if (user_id) {
      stmt = db.prepare(`
        SELECT * FROM scans WHERE user_id = ? ORDER BY timestamp DESC
      `);
      var scans = stmt.all(user_id);
    } else {
      stmt = db.prepare(`SELECT * FROM scans ORDER BY timestamp DESC`);
      var scans = stmt.all();
    }

    const formattedScans = scans.map(scan => ({
      ...scan,
      vulnerabilities: JSON.parse(scan.vulnerabilities || '[]'),
    }));
    
    res.json(formattedScans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get scan history for a user
app.get('/api/scan-history/:user_id', (req, res) => {
  try {
    const { user_id } = req.params;
    const { start_date, end_date } = req.query;

    let query = `SELECT * FROM scan_history WHERE user_id = ?`;
    const params = [user_id];

    if (start_date) {
      query += ` AND scan_date >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND scan_date <= ?`;
      params.push(end_date);
    }

    query += ` ORDER BY scan_date DESC, scan_time DESC`;

    const stmt = db.prepare(query);
    const history = stmt.all(...params);
    
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get daily statistics for a user
app.get('/api/daily-stats/:user_id', (req, res) => {
  try {
    const { user_id } = req.params;
    const { start_date, end_date } = req.query;

    let query = `SELECT * FROM daily_stats WHERE user_id = ?`;
    const params = [user_id];

    if (start_date) {
      query += ` AND scan_date >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND scan_date <= ?`;
      params.push(end_date);
    }

    query += ` ORDER BY scan_date DESC`;

    const stmt = db.prepare(query);
    const stats = stmt.all(...params);
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user profile
app.get('/api/users/:user_id', (req, res) => {
  try {
    const { user_id } = req.params;
    const stmt = db.prepare(`
      SELECT id, username, email, created_at, last_login FROM users WHERE id = ?
    `);
    const user = stmt.get(user_id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete all scans for a user
app.delete('/api/scans', (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (user_id) {
      const stmt = db.prepare('DELETE FROM scans WHERE user_id = ?');
      stmt.run(user_id);
      res.json({ message: 'All scans for user deleted' });
    } else {
      const stmt = db.prepare('DELETE FROM scans');
      stmt.run();
      res.json({ message: 'All scans deleted' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── AI Audit Endpoints ──

app.get('/api/status', (req, res) => {
  res.json({
    available: !!AI_API_KEY,
    provider: AI_PROVIDER,
    configured: !!AI_API_KEY,
    database: 'SQLite (better-sqlite3)',
    databasePath: dbPath,
    message: AI_API_KEY ? 'Backend AI is configured.' : 'AI API key is not configured on the backend.',
  });
});

app.post('/api/audit', async (req, res) => {
  const { code, language, apiKey, provider, user_id } = req.body;
  if (!code || typeof code !== 'string' || code.trim().length < 5) {
    return res.status(400).json({ error: 'Invalid code payload.' });
  }
  if (!language || typeof language !== 'string') {
    return res.status(400).json({ error: 'Language is required.' });
  }

  try {
    console.log('[API Audit] Starting audit for language:', language);
    console.log('[API Audit] Using API Key:', apiKey ? '(client provided)' : '(server-side)');
    
    const findings = await runAIAudit(code, language, apiKey, provider);
    
    console.log('[API Audit] Audit completed. Findings:', findings.length);
    
    // Store the audit result in database if user_id is provided
    if (user_id && findings.length > 0) {
      const avgScore = findings.reduce((sum, f) => sum + (f.severity === 'high' ? 10 : f.severity === 'medium' ? 5 : 2), 0) / findings.length;
      const scanStmt = db.prepare(`
        INSERT INTO scans (user_id, code, language, vulnerabilities, score)
        VALUES (?, ?, ?, ?, ?)
      `);
      scanStmt.run(user_id, code, language, JSON.stringify(findings), avgScore);
    }
    
    res.json({ findings });
  } catch (error) {
    console.error('[API Audit ERROR]', error.message);
    console.error('[API Audit ERROR Stack]', error.stack);
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
  console.log(`[Config] AI Provider: ${AI_PROVIDER}`);
  console.log(`[Config] AI API Key loaded: ${AI_API_KEY ? '✓ YES' : '✗ NO'}`);
  if (AI_API_KEY) {
    console.log(`[Config] API Key starts with: ${AI_API_KEY.substring(0, 20)}...`);
  }
});