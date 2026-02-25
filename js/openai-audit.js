/**
 * VibeGuard – OpenAI Logic Audit
 * Uses GPT-4o/GPT-4o-mini to detect logic hallucinations and structural issues
 */

const SYSTEM_PROMPT = `You are VibeGuard's AI Security Auditor, specialized in detecting logic hallucinations and structural issues in AI-generated code.

Your job is to analyze code for:
1. HALLUCINATED LIBRARIES: References to non-existent functions, methods, or modules (e.g., calling db.magicFetch() that doesn't exist)
2. INFINITE LOOPS: Loops with conditions that can never terminate
3. UNHANDLED PROMISES: async operations without await, .then(), or .catch()
4. RACE CONDITIONS: Concurrent modifications to shared state without proper synchronization
5. LOGIC TAUTOLOGIES: Conditions that are always true or always false (e.g., if (x === x))
6. DEAD CODE: Code after return statements or unreachable branches
7. TYPE COERCION BUGS: Dangerous implicit type conversions (e.g., "5" + 2 === "52")
8. MISSING NULL CHECKS: Accessing properties on values that could be null/undefined
9. OFF-BY-ONE ERRORS: Array bounds issues (e.g., for i <= arr.length)
10. MEMORY LEAKS: Event listeners added without removal, timers not cleared

Respond ONLY with a valid JSON array. Each element must have exactly these fields:
{
  "id": "UNIQUE_ID_IN_SNAKE_CASE",
  "name": "Short descriptive name",
  "severity": "High" | "Medium" | "Low",
  "owasp": "Relevant OWASP category or 'Logic Error'",
  "line": <estimated line number as integer or 1 if unknown>,
  "snippet": "The relevant code snippet (max 80 chars)",
  "description": "Clear explanation of the issue (1-2 sentences)",
  "fix": "Specific actionable fix with code example",
  "source": "AI Audit"
}

If no issues are found, return an empty array: []
Do NOT include any text outside the JSON array. Do NOT use markdown code blocks.`;

/**
 * Run OpenAI logic audit
 * @param {string} code - Source code
 * @param {string} language - Programming language
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<Array>} Array of findings
 */
async function runOpenAIAudit(code, language, apiKey) {
  if (!apiKey || !apiKey.startsWith('sk-')) {
    return [];
  }

  const truncatedCode = code.length > 8000 ? code.substring(0, 8000) + '\n// ... (truncated)' : code;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Analyze this ${language} code for logic hallucinations and structural issues:\n\n\`\`\`${language}\n${truncatedCode}\n\`\`\``,
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.warn('OpenAI API error:', err.error?.message || response.statusText);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';

    // Parse – handle both array and object wrapping
    let parsed;
    try {
      parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
      // Sometimes GPT wraps in { findings: [...] } or { issues: [...] }
      const key = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
      return key ? parsed[key] : [];
    } catch {
      return [];
    }
  } catch (err) {
    console.warn('OpenAI audit failed:', err.message);
    return [];
  }
}
