/**
 * VibeGuard – Results Page Renderer
 * Reads scan result from localStorage and populates the results.html page
 */

(function () {
  // ── Load result ──
  let result;
  try {
    result = JSON.parse(localStorage.getItem('vg_active_result') || 'null');
  } catch { result = null; }

  if (!result) {
    document.getElementById('results-meta').textContent = 'No scan data found. Please run a scan first.';
    document.getElementById('findings-container').innerHTML =
      '<div class="history-empty"><div class="empty-icon">📭</div><p>No scan data.</p><a href="scan.html" class="btn-primary" style="margin-top:1rem;display:inline-flex;">Go to Scanner</a></div>';
    return;
  }

  const { score, breakdown, grade, gradeColor, gradeEmoji, findings, roadmap, language, lines, aiEnabled, timestamp } = result;

  // ── Meta header ──
  const ts = new Date(timestamp);
  document.getElementById('results-meta').textContent =
    `${language.charAt(0).toUpperCase() + language.slice(1)} · ${lines} lines · ${findings.length} issue${findings.length !== 1 ? 's' : ''} found · ${ts.toLocaleString()}`;

  document.title = `Score ${score}/100 – VibeGuard`;

  // ── Score gauge ──
  const scoreNum = document.getElementById('score-num');
  const scoreArc = document.getElementById('score-arc');
  const scoreGrade = document.getElementById('score-grade');
  const CIRCUM = 314;

  scoreGrade.textContent = `${gradeEmoji} ${grade}`;
  scoreGrade.style.color = gradeColor;

  let arcColor;
  if (score >= 75) arcColor = '#10b981';
  else if (score >= 50) arcColor = '#f59e0b';
  else if (score >= 25) arcColor = '#f97316';
  else arcColor = '#ef4444';

  scoreArc.style.stroke = arcColor;

  // Animate score counter and arc
  let cur = 0;
  const targetScore = score;
  const duration = 1500;
  const startTime = performance.now();

  function animateScore(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    cur = Math.round(eased * targetScore);
    scoreNum.textContent = cur;
    scoreNum.style.color = arcColor;
    const offset = CIRCUM - (CIRCUM * eased * targetScore / 100);
    scoreArc.style.strokeDashoffset = offset;
    if (progress < 1) requestAnimationFrame(animateScore);
  }
  requestAnimationFrame(animateScore);

  // ── Breakdown counts ──
  document.getElementById('cnt-critical').textContent = breakdown.Critical || 0;
  document.getElementById('cnt-high').textContent = breakdown.High || 0;
  document.getElementById('cnt-medium').textContent = breakdown.Medium || 0;
  document.getElementById('cnt-low').textContent = breakdown.Low || 0;
  document.getElementById('cnt-info').textContent = breakdown.Info || 0;

  // ── Meta panel ──
  document.getElementById('meta-lang').textContent = language;
  document.getElementById('meta-lines').textContent = lines;
  document.getElementById('meta-ai').textContent = aiEnabled ? '✅ Enabled' : '⚠ Skipped (no key)';
  document.getElementById('meta-time').textContent = ts.toLocaleTimeString();

  // ── Findings ──
  const container = document.getElementById('findings-container');
  const countLabel = document.getElementById('findings-count-label');

  if (!findings || findings.length === 0) {
    container.innerHTML = `<div class="no-findings"><span class="check">✅</span>No issues found! Your code is clean.</div>`;
    countLabel.textContent = '(0 issues)';
  } else {
    countLabel.textContent = `(${findings.length} issue${findings.length !== 1 ? 's' : ''})`;
    const sevOrder = ['Critical', 'High', 'Medium', 'Low', 'Info'];
    const sorted = [...findings].sort((a, b) =>
      sevOrder.indexOf(a.severity) - sevOrder.indexOf(b.severity));

    container.innerHTML = `<div class="vuln-list">${sorted.map((f, i) => buildFindingCard(f, i)).join('')}</div>`;

    // Accordion toggle
    container.querySelectorAll('.vuln-header').forEach(header => {
      header.addEventListener('click', () => {
        const item = header.closest('.vuln-item');
        item.classList.toggle('open');
      });
    });

    // Auto-open first critical/high
    const firstSevere = container.querySelector('.vuln-item');
    if (firstSevere) firstSevere.classList.add('open');
  }

  // ── Roadmap ──
  const roadmapEl = document.getElementById('roadmap-container');
  roadmapEl.innerHTML = markdownToHtml(roadmap || '');

  // ── Export buttons ──
  document.getElementById('copy-roadmap-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(roadmap || '').then(() => showToast('✅ Roadmap copied!'));
  });

  document.getElementById('copy-report-btn').addEventListener('click', () => {
    const report = buildTextReport(result);
    navigator.clipboard.writeText(report).then(() => showToast('✅ Report copied!'));
  });

  document.getElementById('print-btn').addEventListener('click', () => window.print());
})();

// ── Build finding card HTML ──
function buildFindingCard(f, i) {
  const sevClass = `sev-${f.severity.toLowerCase()}`;
  return `
<div class="vuln-item" style="border-left: 3px solid ${sevColor(f.severity)}">
  <div class="vuln-header">
    <span class="vuln-severity ${sevClass}">${f.severity}</span>
    <span class="vuln-name">${escHtml(f.name)}</span>
    <span class="vuln-line">L${f.line}</span>
    <span class="vuln-toggle">▼</span>
  </div>
  <div class="vuln-body">
    <div class="vuln-desc">
      <strong style="color:var(--text-muted);font-size:0.78rem;text-transform:uppercase;letter-spacing:0.5px">${f.owasp || ''}</strong>
      ${f.source ? `<span style="margin-left:8px;font-size:0.75rem;padding:1px 6px;border-radius:4px;background:rgba(124,58,237,0.15);color:#a78bfa">${f.source}</span>` : ''}
      <p style="margin-top:0.5rem">${escHtml(f.description)}</p>
    </div>
    ${f.snippet ? `<div class="vuln-code"><pre>${escHtml(f.snippet)}</pre></div>` : ''}
    <div class="vuln-fix">
      <div class="fix-label">💡 Recommended Fix</div>
      <p style="white-space:pre-wrap;font-family:'JetBrains Mono',monospace;font-size:0.82rem">${escHtml(f.fix)}</p>
    </div>
  </div>
</div>`;
}

function sevColor(sev) {
  const map = { Critical: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#10b981', Info: '#93c5fd' };
  return map[sev] || '#94a3b8';
}

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function buildTextReport(result) {
  const { score, grade, language, lines, findings, roadmap, timestamp } = result;
  const ts = new Date(timestamp).toLocaleString();
  let text = `VibeGuard Audit Report\n${'='.repeat(40)}\n`;
  text += `Date: ${ts}\nLanguage: ${language}\nLines: ${lines}\nScore: ${score}/100 (${grade})\nIssues: ${findings.length}\n\n`;
  text += `FINDINGS\n${'-'.repeat(40)}\n`;
  findings.forEach((f, i) => {
    text += `${i+1}. [${f.severity}] ${f.name} (Line ${f.line})\n`;
    text += `   ${f.description}\n   Fix: ${f.fix}\n\n`;
  });
  text += `\nREFACTORING ROADMAP\n${'-'.repeat(40)}\n${roadmap}`;
  return text;
}

// ── Toast ──
function showToast(message, isError = false) {
  const e = document.querySelector('.toast');
  if (e) e.remove();
  const t = document.createElement('div');
  t.className = 'toast' + (isError ? ' error' : '');
  t.textContent = message;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
