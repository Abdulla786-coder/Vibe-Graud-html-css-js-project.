const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const dbPath = path.join(__dirname, 'vibeguard.db');
const db = new Database(dbPath);

// Create scans table
db.exec(`
  CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    language TEXT NOT NULL,
    vulnerabilities TEXT, -- JSON string
    score REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Routes
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

app.get('/api/scans', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM scans ORDER BY timestamp DESC
    `);
    const scans = stmt.all().map(scan => ({
      ...scan,
      vulnerabilities: JSON.parse(scan.vulnerabilities || '[]')
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});