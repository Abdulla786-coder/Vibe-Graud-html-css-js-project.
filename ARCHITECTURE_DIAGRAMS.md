# VibeGuard Architecture & Data Flow Diagrams

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                            │
│  (index.html, scan.html, results.html, history.html)       │
└────────────────────────┬────────────────────────────────────┘
                         │
                    HTTP/REST
                         │
        ┌────────────────┴─────────────────┐
        │                                  │
        ▼                                  ▼
┌──────────────────┐          ┌──────────────────────┐
│  API Endpoints   │          │  Static Files (CSS)  │
│  (Express.js)    │          └──────────────────────┘
│                  │
│ • /api/auth/*    │
│ • /api/scans     │
│ • /api/history   │
│ • /api/stats     │
│ • /api/audit     │
└────────────────┬─────────────────────────┘
                 │
        ┌────────┴──────────┐
        │                   │
        ▼                   ▼
   ┌─────────┐      ┌───────────────┐
   │ AI API  │      │ SQLite Driver │
   │(OpenAI)│      │ (better-sqlite3)
   └─────────┘      └───────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ vibeguard.db │
                    │   (SQLite)   │
                    └──────────────┘
```

---

## Database Schema Relationships

```
                    ┌─────────────────┐
                    │    USERS        │
                    ├─────────────────┤
                    │ id (PK)         │ ◄── Primary Key
                    │ username UNIQUE │
                    │ email UNIQUE    │
                    │ password        │
                    │ created_at      │
                    │ last_login      │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
         1:M               1:M                1:M
          │                  │                  │
          ▼                  ▼                  ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  SCANS       │  │SCAN_HISTORY  │  │DAILY_STATS   │
    ├──────────────┤  ├──────────────┤  ├──────────────┤
    │ id           │  │ id           │  │ id           │
    │ user_id (FK) │  │ user_id (FK) │  │ user_id (FK) │
    │ code         │  │ scan_id (FK) │  │ scan_date    │
    │ language     │  │ code_snippet │  │ total_scans  │
    │ vulns (JSON) │  │ vulns_count  │  │ avg_score    │
    │ score        │  │ score        │  │ high_count   │
    │ timestamp    │  │ scan_date    │  │ med_count    │
    └──────────────┘  │ status       │  │ low_count    │
         │ 1:M        └──────────────┘  └──────────────┘
         │
        └─────────────────┘
         (Linked via scan_id)
```

---

## Data Flow: User Registration

```
CLIENT REQUEST
    │
    ├─ POST /api/auth/register
    ├─ Body: { username, email, password }
    │
    ▼
EXPRESS SERVER
    │
    ├─ Validate input
    ├─ Check uniqueness (username, email)
    │
    ▼
DATABASE INSERT
    │
    ├─ INSERT INTO users (username, email, password, created_at)
    │
    ▼
RESPONSE
    │
    └─ { id, username, email, message }
```

---

## Data Flow: User Login

```
CLIENT REQUEST
    │
    ├─ POST /api/auth/login
    ├─ Body: { username, password }
    │
    ▼
DATABASE QUERY
    │
    ├─ SELECT * FROM users WHERE username=? AND password=?
    │
    ▼
AUTHENTICATION CHECK
    │
    ├─ If found → Continue
    ├─ If not found → Return error 401
    │
    ▼
UPDATE LOGIN TIMESTAMP
    │
    ├─ UPDATE users SET last_login=NOW() WHERE id=?
    │
    ▼
RESPONSE
    │
    └─ { id, username, email, message: "Login successful" }
```

---

## Data Flow: Submit Code Scan

```
CLIENT REQUEST
    │
    ├─ POST /api/scans
    ├─ Body: { code, language, vulnerabilities[], score, user_id }
    │
    ▼
STEP 1: INSERT INTO SCANS
    │
    ├─ INSERT INTO scans (user_id, code, language, vulnerabilities, score, timestamp)
    ├─ Get scan_id from insert result
    │
    ▼
STEP 2: INSERT INTO SCAN_HISTORY
    │
    ├─ INSERT INTO scan_history 
    ├─   (user_id, scan_id, code_snippet, language, 
    ├─    vulnerabilities_count, security_score, scan_date, status)
    ├─ Use today's date for scan_date
    │
    ▼
STEP 3: UPDATE DAILY_STATS
    │
    ├─ Check if record exists for (user_id, today)
    ├─ If exists: UPDATE totals and averages
    ├─ If not: INSERT new record
    ├─ Count vulnerabilities by severity (high/medium/low)
    │
    ▼
RESPONSE
    │
    └─ { id: scan_id, message: "Scan recorded successfully" }


DATABASES AFFECTED:
├─ SCANS table: 1 new record (full code + details)
├─ SCAN_HISTORY table: 1 new record (code snippet + metadata)
└─ DAILY_STATS table: 1 updated record (aggregated metrics)
```

---

## Data Flow: Get Scan History

```
CLIENT REQUEST
    │
    ├─ GET /api/scan-history/user_id
    ├─ Optional: ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
    │
    ▼
DATABASE QUERY
    │
    ├─ SELECT * FROM scan_history
    ├─ WHERE user_id = ?
    ├─ AND scan_date BETWEEN start_date AND end_date (if provided)
    ├─ ORDER BY scan_date DESC, scan_time DESC
    │
    ▼
RESPONSE
    │
    └─ [
        {
          id, user_id, scan_id,
          code_snippet,  ← First 500 chars of code
          language,
          vulnerabilities_count,
          security_score,
          scan_date,  ← Just the date (YYYY-MM-DD)
          scan_time,  ← Full timestamp
          status
        },
        ... more records ...
      ]

USEFUL FOR:
├─ Viewing user's scan history
├─ Filtering by date range
├─ Seeing vulnerability trends
└─ Audit trail
```

---

## Data Flow: Get Daily Statistics

```
CLIENT REQUEST
    │
    ├─ GET /api/daily-stats/user_id
    ├─ Optional: ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
    │
    ▼
DATABASE QUERY
    │
    ├─ SELECT * FROM daily_stats
    ├─ WHERE user_id = ?
    ├─ AND scan_date BETWEEN start_date AND end_date (if provided)
    ├─ ORDER BY scan_date DESC
    │
    ▼
RESPONSE
    │
    └─ [
        {
          id,
          user_id,
          scan_date,  ← Date (YYYY-MM-DD)
          total_scans,  ← Total scans that day
          avg_score,    ← Average security score
          high_severity_count,     ← Count of high vulns
          medium_severity_count,   ← Count of medium vulns
          low_severity_count,      ← Count of low vulns
          last_updated  ← When stats were last updated
        },
        ... more days ...
      ]

USEFUL FOR:
├─ Viewing daily trends
├─ Comparing security over time
├─ Vulnerability breakdown by severity
└─ Performance metrics
```

---

## Data Flow: Delete User (Cascade)

```
CLIENT REQUEST
    │
    ├─ DELETE FROM users WHERE id = ?
    │
    ▼
FOREIGN KEY CONSTRAINTS
    │
    ├─ ON DELETE CASCADE activated
    │
    ▼
RECORDS DELETED IN ORDER:
    │
    ├─ 1. SCAN_HISTORY records (user_id = ?)
    ├─ 2. DAILY_STATS records (user_id = ?)
    ├─ 3. SCANS records (user_id = ?)
    ├─ 4. USERS record (id = ?)
    │
    ▼
RESULT
    │
    └─ Complete user erasure with all related data
       (No orphaned records remain)
```

---

## API Response Times (Expected)

```
Operation                    | Response Time
-----------------------------|----------------
Register                     | ~10ms
Login                        | ~10ms
Submit scan                  | ~50ms (includes 3 DB ops)
Get scans (100 records)     | ~20ms
Get scan history (30 days)  | ~15ms
Get daily stats (30 days)   | ~10ms
Get user profile            | ~5ms
Delete user (cascade)       | ~50ms
AI Audit                    | ~1000-5000ms (AI API call)
```

---

## Database Indexes & Query Optimization

```
INDEXES CREATED:
│
├─ idx_scans_user_id
│  ├─ Table: scans
│  ├─ Column: user_id
│  └─ Purpose: Fast filtering by user
│
├─ idx_scans_timestamp
│  ├─ Table: scans
│  ├─ Column: timestamp
│  └─ Purpose: Fast sorting by time
│
├─ idx_scan_history_user_id
│  ├─ Table: scan_history
│  ├─ Column: user_id
│  └─ Purpose: Fast user history retrieval
│
├─ idx_scan_history_date
│  ├─ Table: scan_history
│  ├─ Column: scan_date
│  └─ Purpose: Fast date range filtering
│
├─ idx_daily_stats_user_id
│  ├─ Table: daily_stats
│  ├─ Column: user_id
│  └─ Purpose: Fast stats retrieval
│
└─ idx_daily_stats_date
   ├─ Table: daily_stats
   ├─ Column: scan_date
   └─ Purpose: Fast date range filtering
```

---

## Typical Query Patterns

### Pattern 1: Get User's Latest Scans
```sql
SELECT * FROM scans 
WHERE user_id = 1 
ORDER BY timestamp DESC 
LIMIT 10;

INDEXES USED: idx_scans_user_id
```

### Pattern 2: Get Scans from Last 7 Days
```sql
SELECT * FROM scan_history
WHERE user_id = 1 
  AND scan_date >= date('now', '-7 days')
ORDER BY scan_date DESC;

INDEXES USED: idx_scan_history_user_id, idx_scan_history_date
```

### Pattern 3: Get Daily Stats for Date Range
```sql
SELECT * FROM daily_stats
WHERE user_id = 1 
  AND scan_date BETWEEN '2026-05-01' AND '2026-05-31'
ORDER BY scan_date DESC;

INDEXES USED: idx_daily_stats_user_id, idx_daily_stats_date
```

### Pattern 4: Calculate Vulnerability Trends
```sql
SELECT scan_date, 
       SUM(high_severity_count) as daily_high,
       SUM(medium_severity_count) as daily_medium,
       SUM(low_severity_count) as daily_low
FROM daily_stats
WHERE user_id = 1 
  AND scan_date >= date('now', '-30 days')
GROUP BY scan_date
ORDER BY scan_date DESC;

INDEXES USED: idx_daily_stats_user_id, idx_daily_stats_date
```

---

## Error Handling Flow

```
API REQUEST
    │
    ▼
INPUT VALIDATION
    │
    ├─ Is input present? ─→ NO ──→ 400 Bad Request
    ├─ Is data type correct? ─→ NO ──→ 400 Bad Request
    ├─ Is data in valid range? ─→ NO ──→ 400 Bad Request
    │
    ▼
AUTHENTICATION (if needed)
    │
    ├─ User exists? ─→ NO ──→ 404 Not Found
    ├─ Credentials valid? ─→ NO ──→ 401 Unauthorized
    │
    ▼
UNIQUENESS CHECKS (if needed)
    │
    ├─ Username unique? ─→ NO ──→ 409 Conflict
    ├─ Email unique? ─→ NO ──→ 409 Conflict
    │
    ▼
DATABASE OPERATION
    │
    ├─ Execute query
    ├─ Got error? ─→ YES ──→ 500 Server Error
    │
    ▼
SUCCESS
    │
    └─ 200/201 + Response Data
```

---

## Performance Optimization Tips

```
QUERY OPTIMIZATION:
├─ Always filter by user_id (primary isolation)
├─ Use date ranges instead of full table scans
├─ Limit result sets when possible
└─ Use indexes on WHERE and ORDER BY columns

CACHING STRATEGIES:
├─ Cache user profiles (rarely change)
├─ Cache daily stats (calculated once per day)
├─ Don't cache scans (frequently added)
└─ Use Redis for session management (if scaling)

SCALING READINESS:
├─ Indexes present for all common queries
├─ Foreign keys maintain referential integrity
├─ Cascade delete prevents orphaned records
├─ Parameterized queries prevent SQL injection
└─ User isolation enables sharding if needed
```

---

## Database Growth Visualization

```
1 Month (1000 scans):
├─ SCANS: ~200-500 KB
├─ SCAN_HISTORY: ~100-200 KB
├─ DAILY_STATS: ~5-10 KB
└─ Total: ~300-700 KB

1 Year (12000 scans):
├─ SCANS: ~2.4-6 MB
├─ SCAN_HISTORY: ~1.2-2.4 MB
├─ DAILY_STATS: ~60-120 KB
└─ Total: ~3.7-8.5 MB

3 Years (36000 scans):
├─ SCANS: ~7-18 MB
├─ SCAN_HISTORY: ~3.6-7.2 MB
├─ DAILY_STATS: ~180-360 KB
└─ Total: ~11-25 MB
```

---

## Deployment Architecture (Production Ready)

```
┌─────────────────────────────────────────────────────┐
│           NGINX/Apache (Reverse Proxy)              │
│              (HTTPS/SSL Termination)                │
└─────────────────┬───────────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
        ▼                    ▼
┌──────────────┐      ┌──────────────┐
│  Node.js     │      │  Node.js     │
│  Server 1    │      │  Server 2    │
│  (Express)   │      │  (Express)   │
└──────┬───────┘      └───────┬──────┘
       │                      │
       └──────────┬───────────┘
                  │
                  ▼
        ┌──────────────────┐
        │  Shared SQLite   │
        │  vibeguard.db    │
        │                  │
        │ (Network Share   │
        │  or Local Copy)  │
        └──────────────────┘
```

---

**Architecture Documentation** | Updated: May 25, 2026  
**Database**: SQLite with better-sqlite3  
**Framework**: Express.js  
**Status**: ✅ Production Ready
