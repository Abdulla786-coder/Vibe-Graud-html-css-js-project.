/**
 * VibeGuard SAST Engine
 * Regex-based static analysis covering OWASP Top 10 patterns for JS/TS/Python
 */

const SAST_RULES = [
  // ── CRITICAL ──
  {
    id: 'HARDCODED_PASSWORD',
    name: 'Hardcoded Password',
    severity: 'Critical',
    owasp: 'A02:2021 – Cryptographic Failures',
    pattern: /(?:password|passwd|pwd|secret)\s*[:=]\s*["'][^"']{1,100}["']/gi,
    description: 'A hardcoded password was detected. Credentials embedded in source code are exposed to anyone with repository access and cannot be rotated without a code change.',
    fix: 'Move credentials to environment variables (process.env.PASSWORD or os.environ[\'PASSWORD\']) and use a secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault) in production.',
  },
  {
    id: 'HARDCODED_API_KEY',
    name: 'Hardcoded API Key / Token',
    severity: 'Critical',
    owasp: 'A02:2021 – Cryptographic Failures',
    pattern: /(?:api_key|apikey|api_secret|access_token|auth_token|bearer)\s*[:=]\s*["'][^"']{6,}["']/gi,
    description: 'An API key or token is hardcoded in the source. This allows automated secret-scanning tools and anyone reading the repo to use your credentials.',
    fix: 'Load keys via environment variables: const apiKey = process.env.API_KEY. Add .env to .gitignore and use dotenv or python-dotenv.',
  },
  {
    id: 'SQL_INJECTION',
    name: 'SQL Injection (String Concatenation)',
    severity: 'Critical',
    owasp: 'A03:2021 – Injection',
    pattern: /(?:execute|query|cursor\.execute)\s*\(?\s*["'`]?\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP)\s+.{0,80}["'`]?\s*\+|["'`]\s*(?:SELECT|INSERT|UPDATE|DELETE)\s+.{0,60}\+\s*\w/gi,
    description: 'User-controlled input is concatenated directly into a SQL query. This is the most classic injection vulnerability allowing attackers to read, modify, or delete database content.',
    fix: 'Use parameterized queries / prepared statements:\n  JS: db.query("SELECT * FROM users WHERE id = ?", [userId])\n  Python: cursor.execute("SELECT * FROM users WHERE id=%s", (user_id,))',
  },
  {
    id: 'PICKLE_DESERIALIZATION',
    name: 'Insecure Pickle Deserialization',
    severity: 'Critical',
    owasp: 'A08:2021 – Software and Data Integrity Failures',
    pattern: /pickle\.loads?\s*\(/gi,
    description: 'pickle.loads() can execute arbitrary Python code during deserialization. Never deserialize pickle data from untrusted sources.',
    fix: 'Use JSON (json.loads) or safe serialization formats like MessagePack. If pickle is required, sign and verify the data with HMAC before deserializing.',
  },

  // ── HIGH ──
  {
    id: 'XSS_INNER_HTML',
    name: 'Cross-Site Scripting (XSS) via innerHTML',
    severity: 'High',
    owasp: 'A03:2021 – Injection',
    pattern: /\.innerHTML\s*=/gi,
    description: 'Assigning to innerHTML with user-controlled data allows attackers to inject malicious scripts that run in visitors\' browsers, stealing sessions, credentials, or data.',
    fix: 'Use textContent for plain text: element.textContent = userInput.\nFor rich HTML, sanitize with DOMPurify: element.innerHTML = DOMPurify.sanitize(userInput).',
  },
  {
    id: 'EVAL_USAGE',
    name: 'Dangerous eval() Usage',
    severity: 'High',
    owasp: 'A03:2021 – Injection',
    pattern: /\beval\s*\(/gi,
    description: 'eval() executes arbitrary code strings. If any part of that string comes from user input or an external source, attackers can run any JavaScript on your server or client.',
    fix: 'Eliminate eval(). Use JSON.parse() for data parsing, or refactor logic to avoid dynamic code execution. For templating, use a proper template engine.',
  },
  {
    id: 'OS_SYSTEM',
    name: 'Shell Command Injection (os.system / subprocess)',
    severity: 'High',
    owasp: 'A03:2021 – Injection',
    pattern: /\bos\.system\s*\(|\bsubprocess\.(call|run|Popen|check_output)\s*\((?:[^)]*shell\s*=\s*True)/gi,
    description: 'Executing shell commands with user-supplied input can allow command injection, giving attackers full control of the host system.',
    fix: 'Avoid shell=True. Pass arguments as a list: subprocess.run(["ls", "-la"]). Sanitize and validate all inputs that touch shell commands.',
  },
  {
    id: 'WEAK_HASH',
    name: 'Weak Hashing Algorithm (MD5 / SHA-1)',
    severity: 'High',
    owasp: 'A02:2021 – Cryptographic Failures',
    pattern: /\b(?:md5|sha1|sha-1)\b/gi,
    description: 'MD5 and SHA-1 are cryptographically broken. They are vulnerable to collision attacks and should never be used for password hashing or data integrity checks.',
    fix: 'For passwords: use bcrypt, argon2, or scrypt (e.g., Python\'s passlib).\nFor checksums/integrity: use SHA-256 or SHA-3.',
  },
  {
    id: 'DEBUG_MODE',
    name: 'Debug Mode Enabled in Production',
    severity: 'High',
    owasp: 'A05:2021 – Security Misconfiguration',
    pattern: /\bDEBUG\s*=\s*True\b|\bapp\.run\s*\([^)]*debug\s*=\s*True/gi,
    description: 'Debug mode exposes detailed stack traces, environment variables, and an interactive debugger to anyone who triggers an error, leaking sensitive server internals.',
    fix: 'Set DEBUG = os.environ.get("DEBUG", False) and ensure it is False in production. Use a proper logging framework instead.',
  },
  {
    id: 'EXEC_USAGE',
    name: 'exec() Dynamic Code Execution',
    severity: 'High',
    owasp: 'A03:2021 – Injection',
    pattern: /\bexec\s*\(/gi,
    description: 'exec() executes arbitrary Python code. Combined with user input, this becomes a critical remote code execution vulnerability.',
    fix: 'Avoid exec() entirely. Refactor to use proper data structures, AST parsing, or safe abstractions instead of dynamic code execution.',
  },

  // ── MEDIUM ──
  {
    id: 'INSECURE_RANDOM',
    name: 'Insecure Random Number Generator',
    severity: 'Medium',
    owasp: 'A02:2021 – Cryptographic Failures',
    pattern: /\bMath\.random\s*\(\)|\brandom\.random\s*\(\)|\brandom\.randint\b/gi,
    description: 'Math.random() and Python\'s random module are not cryptographically secure. Using them for security-sensitive purposes (tokens, passwords, OTPs) is dangerous.',
    fix: 'JS: use crypto.getRandomValues() or crypto.randomBytes().\nPython: use secrets.token_hex() or secrets.randbelow().',
  },
  {
    id: 'HTTP_USAGE',
    name: 'Insecure HTTP (Non-HTTPS) URL',
    severity: 'Medium',
    owasp: 'A02:2021 – Cryptographic Failures',
    pattern: /http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|\[::\])[a-z]/gi,
    description: 'HTTP transmits data in plaintext, exposing it to man-in-the-middle attacks. All external API calls and resources should use HTTPS.',
    fix: 'Replace all http:// URLs with https:// for any external communications. Use HSTS in production servers.',
  },

  // ── LOW ──
  {
    id: 'CONSOLE_LOG',
    name: 'console.log() Left in Production Code',
    severity: 'Low',
    owasp: 'A09:2021 – Security Logging and Monitoring Failures',
    pattern: /\bconsole\.log\s*\(/gi,
    description: 'Debug log statements can leak sensitive data (tokens, user info, PII) to browser devtools and server logs that may be accessible to attackers.',
    fix: 'Remove console.log statements before deployment. Use a logging library (Winston, Pino) with configurable log levels. Set level to \'error\' in production.',
  },
  {
    id: 'BROAD_EXCEPT',
    name: 'Broad Exception Catch (Silent Failure)',
    severity: 'Low',
    owasp: 'A09:2021 – Security Logging and Monitoring Failures',
    pattern: /\bexcept\s*:\s*\n\s*pass|\bcatch\s*\(\s*(?:e|err|error|ex)\s*\)\s*\{\s*\}/gi,
    description: 'Catching all exceptions and doing nothing silently swallows errors, making debugging impossible and potentially hiding serious security failures.',
    fix: 'Catch specific exceptions. Always log the error with context: except ValueError as e: logger.error("Validation failed: %s", e).',
  },

  // ── INFO ──
  {
    id: 'TODO_FIXME',
    name: 'TODO / FIXME / HACK Comment',
    severity: 'Info',
    owasp: 'A04:2021 – Insecure Design',
    pattern: /\b(?:TODO|FIXME|HACK|XXX|BUG)\b/gi,
    description: 'Unresolved TODO/FIXME comments indicate incomplete or potentially insecure code that hasn\'t been fully reviewed or implemented.',
    fix: 'Review each TODO/FIXME before deployment. Track them in your issue tracker instead of inline comments.',
  },
];

/**
 * Run SAST scan on code string
 * @param {string} code - Source code to analyze
 * @param {string} language - 'javascript' | 'typescript' | 'python'
 * @returns {Array} Array of finding objects
 */
function runSAST(code, language) {
  const lines = code.split('\n');
  const findings = [];

  for (const rule of SAST_RULES) {
    // Skip JS-specific rules for Python and vice versa
    if (language === 'python' && ['XSS_INNER_HTML', 'EVAL_USAGE', 'CONSOLE_LOG', 'INSECURE_RANDOM'].includes(rule.id)) {
      // For Python, we use alternate patterns already embedded
    }
    if (['javascript', 'typescript'].includes(language) && ['PICKLE_DESERIALIZATION', 'OS_SYSTEM', 'DEBUG_MODE', 'EXEC_USAGE'].includes(rule.id)) {
      // Skip Python-only rules for JS/TS
      continue;
    }
    if (language === 'python' && ['XSS_INNER_HTML', 'CONSOLE_LOG'].includes(rule.id)) {
      continue;
    }

    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match;

    while ((match = regex.exec(code)) !== null) {
      // Find line number
      const beforeMatch = code.substring(0, match.index);
      const lineNum = beforeMatch.split('\n').length;
      const snippet = lines[lineNum - 1]?.trim() || match[0];

      findings.push({
        id: rule.id,
        name: rule.name,
        severity: rule.severity,
        owasp: rule.owasp,
        line: lineNum,
        snippet: snippet.substring(0, 100),
        description: rule.description,
        fix: rule.fix,
        source: 'SAST',
      });

      // Avoid too many duplicates for the same rule
      break;
    }
  }

  // Multi-pass for rules that can appear multiple times (console.log, TODO)
  const multiPassRules = ['CONSOLE_LOG', 'TODO_FIXME'];
  for (const ruleId of multiPassRules) {
    const rule = SAST_RULES.find(r => r.id === ruleId);
    if (!rule) continue;
    if (language === 'python' && ruleId === 'CONSOLE_LOG') continue;

    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    const existingLines = findings.filter(f => f.id === ruleId).map(f => f.line);
    let match;
    let count = 0;

    while ((match = regex.exec(code)) !== null && count < 3) {
      const beforeMatch = code.substring(0, match.index);
      const lineNum = beforeMatch.split('\n').length;
      if (!existingLines.includes(lineNum)) {
        const snippet = code.split('\n')[lineNum - 1]?.trim() || match[0];
        findings.push({
          id: rule.id + '_' + lineNum,
          name: rule.name + ` (line ${lineNum})`,
          severity: rule.severity,
          owasp: rule.owasp,
          line: lineNum,
          snippet: snippet.substring(0, 100),
          description: rule.description,
          fix: rule.fix,
          source: 'SAST',
        });
        existingLines.push(lineNum);
        count++;
      }
    }
  }

  // Remove the original single-pass entries for multi-pass rules
  return findings.filter(f => !multiPassRules.includes(f.id));
}
