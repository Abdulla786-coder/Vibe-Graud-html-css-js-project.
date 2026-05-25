# VibeGuard Database Guide

## Database Overview

**Database Type**: SQLite with `better-sqlite3`
**Database File**: `vibeguard.db` (automatically created in project root)

## Database Schema

### 1. **Users Table**
Stores user account information.

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);
```

**Fields**:
- `id`: Unique user identifier
- `username`: Unique username
- `email`: Unique email address
- `password`: User password (consider hashing in production)
- `created_at`: Account creation timestamp
- `last_login`: Last login timestamp

---

### 2. **Scans Table**
Stores detailed code scan results.

```sql
CREATE TABLE scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  vulnerabilities TEXT,
  score REAL NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Fields**:
- `id`: Unique scan identifier
- `user_id`: Reference to user who performed the scan
- `code`: Full code being scanned
- `language`: Programming language (js, py, java, etc.)
- `vulnerabilities`: JSON array of vulnerabilities found
- `score`: Security score (0-100)
- `timestamp`: When scan was performed

---

### 3. **Scan History Table**
Stores daily scan history with aggregated data per scan.

```sql
CREATE TABLE scan_history (
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
```

**Fields**:
- `id`: History record identifier
- `user_id`: Reference to user
- `scan_id`: Reference to original scan
- `code_snippet`: First 500 chars of scanned code
- `language`: Programming language
- `vulnerabilities_count`: Number of vulnerabilities found
- `security_score`: Score for this scan
- `scan_date`: Date of scan (YYYY-MM-DD)
- `scan_time`: Exact timestamp
- `status`: Scan status (completed, failed, pending)

---

### 4. **Daily Stats Table**
Stores aggregated daily statistics per user.

```sql
CREATE TABLE daily_stats (
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
```

**Fields**:
- `id`: Stats record identifier
- `user_id`: Reference to user
- `scan_date`: Date for which stats are calculated
- `total_scans`: Total scans performed that day
- `avg_score`: Average security score that day
- `high_severity_count`: Count of high-severity vulnerabilities
- `medium_severity_count`: Count of medium-severity vulnerabilities
- `low_severity_count`: Count of low-severity vulnerabilities
- `last_updated`: Last update timestamp

---

## API Endpoints

### Authentication

#### Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "secure_password"
}
```

**Response**:
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "message": "User registered successfully"
}
```

---

#### Login User
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "secure_password"
}
```

**Response**:
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "message": "Login successful"
}
```

---

### Scans

#### Create Scan
```
POST /api/scans
Content-Type: application/json

{
  "code": "const x = 'vulnerable code';",
  "language": "javascript",
  "vulnerabilities": [{"type": "xss", "severity": "high"}],
  "score": 45.5,
  "user_id": 1
}
```

**Response**:
```json
{
  "id": 1,
  "message": "Scan recorded successfully"
}
```

---

#### Get All Scans (Optional User Filter)
```
GET /api/scans?user_id=1
```

**Response**:
```json
[
  {
    "id": 1,
    "user_id": 1,
    "code": "...",
    "language": "javascript",
    "vulnerabilities": [...],
    "score": 45.5,
    "timestamp": "2026-05-25T10:30:00Z"
  }
]
```

---

### Scan History

#### Get Scan History for User
```
GET /api/scan-history/1?start_date=2026-05-01&end_date=2026-05-31
```

**Response**:
```json
[
  {
    "id": 1,
    "user_id": 1,
    "scan_id": 1,
    "code_snippet": "const x = 'vulnerable...",
    "language": "javascript",
    "vulnerabilities_count": 3,
    "security_score": 45.5,
    "scan_date": "2026-05-25",
    "scan_time": "2026-05-25T10:30:00Z",
    "status": "completed"
  }
]
```

---

### Daily Statistics

#### Get Daily Stats for User
```
GET /api/daily-stats/1?start_date=2026-05-01&end_date=2026-05-31
```

**Response**:
```json
[
  {
    "id": 1,
    "user_id": 1,
    "scan_date": "2026-05-25",
    "total_scans": 5,
    "avg_score": 52.3,
    "high_severity_count": 8,
    "medium_severity_count": 12,
    "low_severity_count": 15,
    "last_updated": "2026-05-25T15:45:00Z"
  }
]
```

---

### User Profile

#### Get User Information
```
GET /api/users/1
```

**Response**:
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "created_at": "2026-05-20T10:00:00Z",
  "last_login": "2026-05-25T10:30:00Z"
}
```

---

### AI Audit

#### Run Code Audit
```
POST /api/audit
Content-Type: application/json

{
  "code": "const x = 'code to audit';",
  "language": "javascript",
  "apiKey": "sk-...",
  "provider": "openai",
  "user_id": 1
}
```

**Response**:
```json
{
  "findings": [
    {
      "type": "XSS",
      "severity": "high",
      "description": "Potential XSS vulnerability"
    }
  ]
}
```

---

## Database Features

### 1. **User Isolation**
Each scan is associated with a specific user using `user_id` foreign key, ensuring data privacy and security.

### 2. **Automatic Cascade Deletion**
If a user is deleted, all their associated scans, history, and stats are automatically removed.

### 3. **Daily Statistics Tracking**
The `daily_stats` table automatically aggregates:
- Total scans per day
- Average security score
- Vulnerability severity counts

### 4. **Scan History**
Maintains a complete audit trail of all scans with:
- Code snippets for reference
- Vulnerability counts
- Security scores
- Timestamps for tracking

### 5. **Indexing for Performance**
Indexes are created on frequently queried fields:
- `user_id` in scans and history tables
- `timestamp` and `scan_date` for fast filtering
- Composite index on `user_id` and `scan_date` for daily stats

---

## Usage Examples

### Example 1: Complete User Flow

```bash
# 1. Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"pass123"}'

# 2. Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"pass123"}'

# 3. Submit scan
curl -X POST http://localhost:5000/api/scans \
  -H "Content-Type: application/json" \
  -d '{
    "code":"function test(){eval(input);}",
    "language":"javascript",
    "vulnerabilities":[{"type":"eval","severity":"high"}],
    "score":25,
    "user_id":1
  }'

# 4. Get scan history
curl http://localhost:5000/api/scan-history/1

# 5. Get daily stats
curl http://localhost:5000/api/daily-stats/1
```

---

## Important Notes

### Production Recommendations

1. **Security**: 
   - Hash passwords using bcrypt before storing
   - Implement JWT tokens for session management
   - Add HTTPS/SSL encryption
   - Add SQL injection prevention (parameterized queries already used)

2. **Data Privacy**:
   - Consider encrypting sensitive code snippets
   - Implement user consent management
   - Add GDPR compliance features

3. **Performance**:
   - Monitor database size
   - Implement data retention policies
   - Consider archiving old scans

4. **Backups**:
   - Regular database backups
   - Disaster recovery plan
   - Version control integration

---

## Database File Location

- **Development**: `vibeguard.db` in project root
- **Size**: Grows with number of scans (~1-5 MB per 1000 scans)
- **Backup**: Keep regular backups of this file

---

## Troubleshooting

### Database Lock Issues
If you encounter database lock errors:
1. Ensure only one process is accessing the database
2. Restart the server
3. Delete `vibeguard.db` and restart (will lose data)

### Query Performance
If queries are slow:
1. Check indexes are created (they are by default)
2. Analyze query execution: `EXPLAIN QUERY PLAN ...`
3. Consider archiving old records

### Missing Data
Data appears in `scans` table but not in `daily_stats`:
- This is expected; `daily_stats` updates only when scans with `user_id` are recorded
- Manual scans without `user_id` won't update stats

---

For more information, refer to [better-sqlite3 documentation](https://github.com/WiseLibs/better-sqlite3)
