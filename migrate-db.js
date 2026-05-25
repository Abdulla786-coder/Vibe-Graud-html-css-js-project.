#!/usr/bin/env node
/**
 * VibeGuard Database Migration & Setup Script
 * Run with: node migrate-db.js
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'vibeguard.db');
const backupPath = path.join(__dirname, `vibeguard_backup_${Date.now()}.db`);

console.log('\n████████████████████████████████████████████');
console.log('  VibeGuard Database Migration Tool');
console.log('████████████████████████████████████████████\n');

// Check if database already exists
const dbExists = fs.existsSync(dbPath);

if (dbExists) {
  console.log('✓ Existing database found at:', dbPath);
  console.log('✓ Creating backup at:', backupPath);
  
  try {
    fs.copyFileSync(dbPath, backupPath);
    console.log('✓ Backup created successfully\n');
  } catch (error) {
    console.error('✗ Backup failed:', error.message);
    process.exit(1);
  }
} else {
  console.log('✓ No existing database found. Creating new database...\n');
}

try {
  const db = new Database(dbPath);
  
  console.log('📦 Initializing database schema...\n');
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Create tables
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

  console.log('✓ Tables created:');
  console.log('  • users');
  console.log('  • scans');
  console.log('  • scan_history');
  console.log('  • daily_stats');
  
  console.log('\n✓ Indexes created:');
  console.log('  • idx_scans_user_id');
  console.log('  • idx_scans_timestamp');
  console.log('  • idx_scan_history_user_id');
  console.log('  • idx_scan_history_date');
  console.log('  • idx_daily_stats_user_id');
  console.log('  • idx_daily_stats_date');

  // Verify integrity
  console.log('\n🔍 Verifying database integrity...');
  const integrity = db.prepare('PRAGMA integrity_check').all();
  
  if (integrity[0].integrity_check === 'ok') {
    console.log('✓ Database integrity verified');
  } else {
    console.log('✗ Database integrity check failed:', integrity);
    process.exit(1);
  }

  // Get table statistics
  console.log('\n📊 Database Statistics:');
  const stats = db.prepare(`
    SELECT name, SUM(pgcount)*4096 as bytes 
    FROM dbstat 
    GROUP BY name
  `).all();

  const totalSize = fs.statSync(dbPath).size;
  console.log(`  • Database size: ${(totalSize / 1024).toFixed(2)} KB`);
  
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const scanCount = db.prepare('SELECT COUNT(*) as count FROM scans').get().count;
  const historyCount = db.prepare('SELECT COUNT(*) as count FROM scan_history').get().count;
  const statsCount = db.prepare('SELECT COUNT(*) as count FROM daily_stats').get().count;

  console.log(`  • Users: ${userCount}`);
  console.log(`  • Scans: ${scanCount}`);
  console.log(`  • Scan History: ${historyCount}`);
  console.log(`  • Daily Stats: ${statsCount}`);

  // Test query
  console.log('\n🧪 Running test query...');
  const testQuery = db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log(`✓ Test query successful (${testQuery.count} users)`);

  db.close();

  console.log('\n████████████████████████████████████████████');
  console.log('✅ Database Setup Complete!');
  console.log('████████████████████████████████████████████');
  console.log('\nNext steps:');
  console.log('  1. Start server:  npm start');
  console.log('  2. Run tests:     node test-api.js');
  console.log('  3. View logs in:  console output\n');

} catch (error) {
  console.error('\n✗ Database setup failed:');
  console.error('  Error:', error.message);
  
  // Try to restore backup if it exists
  if (dbExists && fs.existsSync(backupPath)) {
    console.log('\n🔄 Attempting to restore backup...');
    try {
      fs.copyFileSync(backupPath, dbPath);
      console.log('✓ Backup restored successfully');
    } catch (restoreError) {
      console.error('✗ Backup restore failed:', restoreError.message);
    }
  }
  
  process.exit(1);
}
