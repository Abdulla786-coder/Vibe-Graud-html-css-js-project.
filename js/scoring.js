/**
 * VibeGuard – Quality Score Algorithm
 * Weighted deduction model: 0–100 score
 */

const SEVERITY_WEIGHTS = {
    Critical: 25,
    High: 15,
    Medium: 8,
    Low: 3,
    Info: 1,
};

/**
 * Calculate quality score from findings
 * @param {Array} findings
 * @returns {{ score: number, breakdown: object, grade: string, gradeColor: string }}
 */
function calculateScore(findings) {
    const breakdown = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 };

    for (const f of findings) {
        const sev = f.severity;
        if (breakdown[sev] !== undefined) breakdown[sev]++;
    }

    let deduction = 0;
    for (const [sev, count] of Object.entries(breakdown)) {
        deduction += count * SEVERITY_WEIGHTS[sev];
    }

    const score = Math.max(0, Math.min(100, 100 - deduction));

    let grade, gradeColor, gradeEmoji;
    if (score >= 90) { grade = 'Excellent'; gradeColor = '#10b981'; gradeEmoji = '🟢'; }
    else if (score >= 75) { grade = 'Good'; gradeColor = '#10b981'; gradeEmoji = '🟢'; }
    else if (score >= 60) { grade = 'Fair'; gradeColor = '#f59e0b'; gradeEmoji = '🟡'; }
    else if (score >= 40) { grade = 'Poor'; gradeColor = '#f97316'; gradeEmoji = '🟠'; }
    else if (score >= 20) { grade = 'Dangerous'; gradeColor = '#ef4444'; gradeEmoji = '🔴'; }
    else { grade = 'Critical Risk'; gradeColor = '#dc2626'; gradeEmoji = '🚨'; }

    return { score, breakdown, grade, gradeColor, gradeEmoji };
}
