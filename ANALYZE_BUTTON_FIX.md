# 🔧 VibeGuard - Code Analyze Button Fix Guide

## ✅ Issues Fixed

1. ✅ **`.env` File Format** - Removed spaces around `=` (was: `AI_API_KEY = value`, now: `AI_API_KEY=value`)
2. ✅ **Better Error Logging** - Added console logs to show API key status and audit process
3. ✅ **Added AI_PROVIDER Setting** - Set to `openai` by default in `.env`

---

## 🚀 Quick Test (3 Steps)

### Step 1: Verify Server is Running
```bash
npm start
```

**Expected Output:**
```
Server running on port 5000
[Config] AI Provider: openai
[Config] AI API Key loaded: ✓ YES
[Config] API Key starts with: sk-proj-ZSxzsfMo...
```

❌ **If you see**: `AI API Key loaded: ✗ NO`
→ The `.env` file isn't being read. Check that it has no spaces: `AI_API_KEY=sk-proj-...`

---

### Step 2: Test API Status Endpoint
Open a browser or terminal and run:

```bash
curl http://localhost:5000/api/status
```

**Expected Response:**
```json
{
  "available": true,
  "provider": "openai",
  "configured": true,
  "database": "SQLite (better-sqlite3)",
  "message": "Backend AI is configured."
}
```

❌ **If `"available"` is `false`:**
→ The API key from `.env` isn't being loaded. Go back to Step 1.

---

### Step 3: Test Code Analysis

1. Open: `http://localhost:5000/scan.html`
2. Paste this code in the textarea:
```javascript
const password = "admin123";
eval(userInput);
document.getElementById("output").innerHTML = userInput;
```
3. Click **"Analyze Code"** button
4. Check the **Terminal/Console Output**

**Expected Terminal Output:**
```
[API Audit] Starting audit for language: javascript
[API Audit] Using API Key: (server-side)
[API Audit] Audit completed. Findings: 3
```

**Expected Browser Result:**
- Progress bar completes all 4 steps
- Results page shows findings with scores

---

## 🐛 Troubleshooting

### Problem 1: "AI API key not configured on backend"
**Cause**: The `.env` file isn't being read correctly

**Fix:**
1. Check `.env` file format (no spaces around `=`):
   ```
   AI_API_KEY=sk-proj-ZSxzsfMo69NSed6...
   PORT=5000
   AI_PROVIDER=openai
   ```

2. Restart the server:
   ```bash
   npm start
   ```

---

### Problem 2: Button doesn't show progress
**Cause**: Frontend error before sending request

**Fix:**
1. Open **Developer Console** (F12)
2. Click **"Analyze Code"**
3. Look for errors in console
4. Common errors:
   - `runAIAudit is not defined` → `openai-audit.js` isn't loaded
   - `fetch failed` → Server isn't running

---

### Problem 3: Progress bar gets stuck
**Cause**: Server error processing request

**Fix:**
1. Check **Terminal Output** for errors starting with `[API Audit ERROR]`
2. Common errors:
   - `fetch API error from OpenAI` → API key is invalid
   - `timeout` → OpenAI API is slow or down

---

### Problem 4: "Using local fallback" message
**Cause**: Server AI audit failed, using built-in heuristics

**This is OK!** The app will still analyze code using local rules.

**To debug:**
1. Check Terminal for `[API Audit ERROR]` message
2. If it's an API key error, fix `.env` file
3. If it's a network error, check internet connection

---

## 📊 Testing Script

Run this command to test the API directly:

**Windows PowerShell:**
```powershell
$body = @{
    code = 'eval(input);'
    language = 'javascript'
} | ConvertTo-Json

Invoke-WebRequest -Uri 'http://localhost:5000/api/audit' `
    -Method POST `
    -Headers @{'Content-Type'='application/json'} `
    -Body $body
```

**Mac/Linux:**
```bash
curl -X POST http://localhost:5000/api/audit \
  -H "Content-Type: application/json" \
  -d '{"code":"eval(input);","language":"javascript"}'
```

**Expected Response:**
```json
{
  "findings": [
    {
      "id": "...",
      "name": "Dynamic Code Execution",
      "severity": "High",
      ...
    }
  ]
}
```

---

## 🔍 What Changed

### `.env` File
**Before:**
```
AI_API_KEY = sk-proj-...
PORT = 5000
```

**After:**
```
AI_API_KEY=sk-proj-...
PORT=5000
AI_PROVIDER=openai
```

### `server.js` Enhanced Logging

Added console output to track:
- ✅ Server startup with config
- ✅ When audit starts
- ✅ API key source (client or server)
- ✅ Number of findings
- ✅ Errors with full stack trace

---

## ✨ How It Should Work Now

```
User clicks "Analyze Code"
         ↓
Frontend validates code input
         ↓
Frontend calls: POST /api/audit
         ↓
Server logs: [API Audit] Starting audit...
         ↓
Server calls: OpenAI API with code
         ↓
Server logs: [API Audit] Audit completed. Findings: X
         ↓
Server returns: { findings: [...] }
         ↓
Frontend displays: Results page with vulnerabilities
```

---

## 🎯 Next Steps

1. **Restart Server**
   ```bash
   npm start
   ```

2. **Test Analysis**
   - Go to `http://localhost:5000/scan.html`
   - Paste code
   - Click "Analyze Code"
   - Check Terminal for logs

3. **Monitor Terminal Output**
   - Look for `[API Audit]` messages
   - Look for `[API Audit ERROR]` if it fails

4. **Check Browser Console** (F12)
   - Click "Console" tab
   - Paste code and analyze
   - See any JavaScript errors?

---

## 📝 Sample Test Cases

### Test 1: SQL Injection (Should Find)
```javascript
const userId = req.params.id;
const query = "SELECT * FROM users WHERE id=" + userId;
db.execute(query);
```

### Test 2: XSS Vulnerability (Should Find)
```javascript
const userInput = req.body.message;
document.getElementById("output").innerHTML = userInput;
```

### Test 3: Hardcoded Credentials (Should Find)
```javascript
const apiKey = "sk-proj-abc123xyz";
const password = "admin123";
```

### Test 4: Clean Code (Should Pass)
```javascript
const message = sanitize(userInput);
document.getElementById("output").textContent = message;
```

---

## 💡 Tips

- **If analysis is slow:** OpenAI API can take 5-10 seconds, be patient
- **If getting timeouts:** Your internet connection might be slow
- **If API key is invalid:** Generate a new one from OpenAI: https://platform.openai.com/account/api-keys

---

## 🆘 Still Not Working?

**Check this checklist:**

- [ ] `.env` file has NO spaces around `=`
- [ ] Server shows `AI API Key loaded: ✓ YES`
- [ ] `/api/status` returns `"available": true`
- [ ] Browser console shows no errors
- [ ] Code input has more than 5 characters
- [ ] Language is selected
- [ ] Internet connection is working

**If still stuck:**
1. Restart server
2. Clear browser cache (Ctrl+Shift+Delete)
3. Check terminal for `[API Audit ERROR]` messages
4. Verify OpenAI API key is valid: https://platform.openai.com/account/api-keys

---

**Status**: 🟢 Ready to Test  
**Last Updated**: May 25, 2026
