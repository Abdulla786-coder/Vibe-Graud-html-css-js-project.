# VibeGuard Database - Quick Reference Card

## 🗄️ Database Schema at a Glance

```
┌─────────────┐
│   USERS     │ (User Accounts)
├─────────────┤
│ id (PK)     │
│ username*   │
│ email*      │
│ password    │
│ created_at  │
│ last_login  │
└─────────────┘
      │1
      │
      ├──────┬──────────┬──────────────┐
      │M     │M         │M             │
      ▼      ▼          ▼              ▼
    ┌──────┐ ┌─────────────┐ ┌──────────────┐
    │SCANS │ │SCAN_HISTORY │ │DAILY_STATS   │
    ├──────┤ ├─────────────┤ ├──────────────┤
    │ id   │ │ id          │ │ id           │
    │code  │ │ scan_id(FK) │ │ scan_date    │
    │lang  │ │ code_snip   │ │ total_scans  │
    │vulns │ │ vuln_count  │ │ avg_score    │
    │score │ │ score       │ │ high_count   │
    │ts    │ │ scan_date   │ │ med_count    │
    │user  │ │ status      │ │ low_count    │
    └──────┘ └─────────────┘ └──────────────┘

* = UNIQUE constraint
```

---

## 🔑 Primary Key Relationships

```
scans.user_id ──FK──> users.id
scan_history.user_id ──FK──> users.id
scan_history.scan_id ──FK──> scans.id
daily_stats.user_id ──FK──> users.id
```

---

## 📊 Table Details

### USERS Table
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT |
| username | TEXT | UNIQUE, NOT NULL |
| email | TEXT | UNIQUE, NOT NULL |
| password | TEXT | NOT NULL |
| created_at | DATETIME | DEFAULT NOW |
| last_login | DATETIME | NULL |

**Indexes**: 
- PRIMARY on id
- UNIQUE on username
- UNIQUE on email

---

### SCANS Table
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT |
| user_id | INTEGER | FK → users.id, NULL |
| code | TEXT | NOT NULL |
| language | TEXT | NOT NULL |
| vulnerabilities | TEXT | JSON array |
| score | REAL | NOT NULL |
| timestamp | DATETIME | DEFAULT NOW |

**Indexes**:
- PRIMARY on id
- INDEX on user_id
- INDEX on timestamp

---

### SCAN_HISTORY Table
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT |
| user_id | INTEGER | FK → users.id |
| scan_id | INTEGER | FK → scans.id |
| code_snippet | TEXT | First 500 chars |
| language | TEXT | NOT NULL |
| vulnerabilities_count | INTEGER | DEFAULT 0 |
| security_score | REAL | NOT NULL |
| scan_date | DATE | NOT NULL (YYYY-MM-DD) |
| scan_time | DATETIME | DEFAULT NOW |
| status | TEXT | 'completed', 'failed', 'pending' |

**Indexes**:
- PRIMARY on id
- INDEX on user_id
- INDEX on scan_date
- COMPOSITE on (user_id, scan_date)

---

### DAILY_STATS Table
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT |
| user_id | INTEGER | FK → users.id |
| scan_date | DATE | NOT NULL (YYYY-MM-DD) |
| total_scans | INTEGER | DEFAULT 0 |
| avg_score | REAL | DEFAULT 0.0 |
| high_severity_count | INTEGER | DEFAULT 0 |
| medium_severity_count | INTEGER | DEFAULT 0 |
| low_severity_count | INTEGER | DEFAULT 0 |
| last_updated | DATETIME | DEFAULT NOW |

**Constraints**:
- UNIQUE(user_id, scan_date)

**Indexes**:
- PRIMARY on id
- INDEX on user_id
- INDEX on scan_date
- COMPOSITE on (user_id, scan_date)

---

## 🚀 Common API Patterns

### Pattern 1: Register & Get User
```bash
# Register
POST /api/auth/register
→ Returns: { id, username, email }

# Get profile
GET /api/users/{id}
→ Returns: { id, username, email, created_at, last_login }
```

### Pattern 2: Submit & Retrieve Scans
```bash
# Create scan
POST /api/scans
Body: { code, language, vulnerabilities, score, user_id }
→ Returns: { id }

# Get all scans
GET /api/scans?user_id={id}
→ Returns: [{ id, user_id, code, language, vulnerabilities, score, timestamp }]
```

### Pattern 3: Get History & Stats
```bash
# Get scan history (optionally filtered by date)
GET /api/scan-history/{user_id}?start_date=2026-05-01&end_date=2026-05-31
→ Returns: [{ id, scan_id, code_snippet, vulnerabilities_count, score, scan_date }]

# Get daily stats (optionally filtered by date)
GET /api/daily-stats/{user_id}?start_date=2026-05-01&end_date=2026-05-31
→ Returns: [{ scan_date, total_scans, avg_score, high_count, medium_count, low_count }]
```

---

## 🔄 Data Flow Diagram

```
┌──────────────────┐
│  Frontend (HTML) │
└────────┬─────────┘
         │ HTTPS
         ▼
┌──────────────────┐
│  Express Server  │
│   (server.js)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│  Better-SQLite3 Driver   │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│   vibeguard.db (SQLite)  │
│  ┌─────────────────────┐ │
│  │ users               │ │
│  │ scans               │ │
│  │ scan_history        │ │
│  │ daily_stats         │ │
│  └─────────────────────┘ │
└──────────────────────────┘
```

---

## 💻 SQL Query Examples

### User Registration
```sql
INSERT INTO users (username, email, password)
VALUES ('john_doe', 'john@example.com', 'hash_password');
```

### Submit Scan
```sql
INSERT INTO scans (user_id, code, language, vulnerabilities, score)
VALUES (1, 'code...', 'javascript', '[]', 45.5);
```

### Get User's Scans (Last 7 Days)
```sql
SELECT * FROM scans 
WHERE user_id = 1 
AND timestamp >= datetime('now', '-7 days')
ORDER BY timestamp DESC;
```

### Get Daily Statistics
```sql
SELECT * FROM daily_stats 
WHERE user_id = 1 
AND scan_date >= date('now', '-30 days')
ORDER BY scan_date DESC;
```

### Get Scan with Highest Vulnerabilities
```sql
SELECT s.*, 
       COUNT(json_each.value) as vuln_count
FROM scans s, json_each(s.vulnerabilities)
WHERE s.user_id = 1
GROUP BY s.id
ORDER BY vuln_count DESC
LIMIT 1;
```

### Delete User & All Data (Cascade)
```sql
DELETE FROM users WHERE id = 1;
-- Automatically deletes:
-- - all scans
-- - all scan_history
-- - all daily_stats
```

---

## 🎯 Performance Optimization Tips

### Query Optimization
- Always filter by `user_id` when possible
- Use `scan_date` range filters to reduce result sets
- Let indexes handle sorting on indexed columns

### Indexing Strategy
```sql
-- Already created indexes:
CREATE INDEX idx_scans_user_id ON scans(user_id);
CREATE INDEX idx_scans_timestamp ON scans(timestamp);
CREATE INDEX idx_scan_history_user_id ON scan_history(user_id);
CREATE INDEX idx_scan_history_date ON scan_history(scan_date);
CREATE INDEX idx_daily_stats_user_id ON daily_stats(user_id);
CREATE INDEX idx_daily_stats_date ON daily_stats(scan_date);
```

### Connection Pooling
Better-sqlite3 uses synchronous calls, no connection pooling needed.

---

## 📋 Typical Response Examples

### Successful Scan Submission
```json
{
  "id": 42,
  "message": "Scan recorded successfully"
}
```

### Get Scan History Response
```json
[
  {
    "id": 5,
    "user_id": 1,
    "scan_id": 42,
    "code_snippet": "eval(userInput); // ... truncated",
    "language": "javascript",
    "vulnerabilities_count": 3,
    "security_score": 35.5,
    "scan_date": "2026-05-25",
    "scan_time": "2026-05-25T14:32:10Z",
    "status": "completed"
  }
]
```

### Daily Stats Response
```json
[
  {
    "id": 1,
    "user_id": 1,
    "scan_date": "2026-05-25",
    "total_scans": 5,
    "avg_score": 42.3,
    "high_severity_count": 8,
    "medium_severity_count": 12,
    "low_severity_count": 15,
    "last_updated": "2026-05-25T15:45:30Z"
  }
]
```

---

## ⚠️ Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 201 | Created | Success - resource created |
| 400 | Bad Request | Invalid input parameters |
| 401 | Unauthorized | Wrong credentials |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate username/email |
| 500 | Server Error | Database error |

---

## 🔐 Security Checklist

- [ ] Passwords hashed with bcrypt
- [ ] HTTPS/SSL enabled
- [ ] SQL injection protection (parameterized queries ✓)
- [ ] XSS protection on code storage
- [ ] CSRF tokens on forms
- [ ] Rate limiting on auth endpoints
- [ ] Regular database backups
- [ ] Access logging enabled
- [ ] Secrets in environment variables

---

## 📞 Database Maintenance

### Regular Tasks
```bash
# Backup database
cp vibeguard.db vibeguard_backup_$(date +%Y%m%d).db

# Check database integrity
sqlite3 vibeguard.db "PRAGMA integrity_check;"

# Optimize database (runs ANALYZE)
sqlite3 vibeguard.db "PRAGMA optimize;"

# View database statistics
sqlite3 vibeguard.db "SELECT name, SUM(pgcount)*4096 as bytes FROM dbstat GROUP BY name;"
```

---

**Last Updated**: May 25, 2026  
**Database Version**: 1.0  
**Format**: SQLite 3
