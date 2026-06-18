/**
 * ResultsStep.jsx
 * Step 4: Shows the ranked candidates dashboard.
 * - Summary stats bar
 * - JD role info panel (collapsible)
 * - Bias Report panel (shown when bias_report present)
 * - Export CSV button
 * - Filterable / sortable candidate list
 * - "Screen Again" CTA to restart the workflow
 */

import { useState, useMemo } from 'react';
import CandidateCard from './CandidateCard';

function scoreColor(val) {
  if (val >= 75) return 'var(--score-great)';
  if (val >= 55) return 'var(--score-good)';
  if (val >= 35) return 'var(--score-mid)';
  return 'var(--score-low)';
}

/** Small pill/tag chip */
function Chip({ label, variant = 'default' }) {
  const styles = {
    default: { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', color: '#a5b4fc' },
    must:    { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',   color: '#fca5a5' },
    soft:    { bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.3)',  color: '#fcd34d' },
    domain:  { bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.3)',   color: '#67e8f9' },
    nice:    { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)',  color: '#6ee7b7' },
  };
  const s = styles[variant] || styles.default;
  return (
    <span style={{
      display: 'inline-block',
      fontSize: '0.72rem',
      fontWeight: 600,
      padding: '3px 10px',
      borderRadius: 20,
      background: s.bg,
      border: `1px solid ${s.border}`,
      color: s.color,
    }}>
      {label}
    </span>
  );
}

/** Row of chips with a label */
function ChipRow({ title, items = [], variant }) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map(item => <Chip key={item} label={item} variant={variant} />)}
      </div>
    </div>
  );
}

/** Collapsible role details panel */
function RoleDetailsPanel({ jd }) {
  const [open, setOpen] = useState(true);
  if (!jd) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(99,102,241,0.07), rgba(139,92,246,0.04))',
      border: '1px solid rgba(99,102,241,0.25)',
      borderRadius: 'var(--radius-lg)',
      marginBottom: 20,
      overflow: 'hidden',
      animation: 'slide-in 0.4s var(--ease-out)',
    }}>
      {/* Panel header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '16px 22px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Role icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', flexShrink: 0,
          boxShadow: '0 0 16px rgba(99,102,241,0.35)',
        }}>📋</div>

        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
            {jd.job_title || 'Role Details'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {jd.experience_level && (
              <span>🎯 {jd.experience_level}</span>
            )}
            {jd.experience_years && (
              <span>⏱ {jd.experience_years}+ years</span>
            )}
            {jd.hard_skills?.length > 0 && (
              <span>🔧 {jd.hard_skills.length} hard skills</span>
            )}
            {jd.must_have?.length > 0 && (
              <span>⚠ {jd.must_have.length} must-haves</span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <div style={{
          color: 'var(--text-muted)',
          fontSize: '1rem',
          transition: 'transform 0.25s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          flexShrink: 0,
        }}>▾</div>
      </button>

      {/* Expandable body */}
      {open && (
        <div style={{ padding: '0 22px 20px', borderTop: '1px solid rgba(99,102,241,0.15)' }}>
          {/* Summary */}
          {jd.summary && (
            <p style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.65,
              margin: '14px 0 16px',
              padding: '12px 14px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 'var(--radius-sm)',
              borderLeft: '3px solid var(--accent-1)',
            }}>
              {jd.summary}
            </p>
          )}

          {/* Chip rows */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '6px 24px' }}>
            <ChipRow title="Hard Skills"      items={jd.hard_skills}    variant="default" />
            <ChipRow title="Soft Skills"      items={jd.soft_skills}    variant="soft" />
            <ChipRow title="Must Have"        items={jd.must_have}      variant="must" />
            <ChipRow title="Nice to Have"     items={jd.nice_to_have}   variant="nice" />
            <ChipRow title="Domain Knowledge" items={jd.domain_knowledge} variant="domain" />
          </div>
        </div>
      )}
    </div>
  );
}

/** Bias Report panel — only renders if bias_report is present */
function BiasReportPanel({ biasReport, candidates }) {
  const [open, setOpen] = useState(true);
  if (!biasReport) return null;

  const { is_homogeneous, flag_message, hidden_gems = [], diversity_note } = biasReport;

  // Find hidden gem candidate objects by ID
  const gemCandidates = candidates.filter(c => hidden_gems.includes(c.candidate_id));

  // Only show panel if there's something to display
  if (!is_homogeneous && hidden_gems.length === 0) return null;

  return (
    <div style={{
      background: is_homogeneous
        ? 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(251,191,36,0.04))'
        : 'linear-gradient(135deg, rgba(16,185,129,0.07), rgba(6,182,212,0.04))',
      border: `1px solid ${is_homogeneous ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
      borderRadius: 'var(--radius-lg)',
      marginBottom: 20,
      overflow: 'hidden',
      animation: 'slide-in 0.5s var(--ease-out)',
    }}>
      {/* Header */}
      <button
        id="bias-report-toggle"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '16px 22px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: is_homogeneous
            ? 'linear-gradient(135deg,#ef4444,#f59e0b)'
            : 'linear-gradient(135deg,#10b981,#06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', flexShrink: 0,
          boxShadow: is_homogeneous
            ? '0 0 16px rgba(239,68,68,0.35)'
            : '0 0 16px rgba(16,185,129,0.35)',
        }}>
          {is_homogeneous ? '⚠️' : '💎'}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: is_homogeneous ? '#fca5a5' : '#6ee7b7',
          }}>
            {is_homogeneous ? 'Diversity Alert' : 'Hidden Gems Detected'}
            {hidden_gems.length > 0 && (
              <span style={{
                marginLeft: 10,
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '2px 10px',
                borderRadius: 20,
                background: 'rgba(16,185,129,0.15)',
                border: '1px solid rgba(16,185,129,0.3)',
                color: '#6ee7b7',
              }}>
                {hidden_gems.length} gem{hidden_gems.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
            AI-powered shortlist diversity analysis
          </div>
        </div>

        <div style={{
          color: 'var(--text-muted)',
          fontSize: '1rem',
          transition: 'transform 0.25s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          flexShrink: 0,
        }}>▾</div>
      </button>

      {/* Body */}
      {open && (
        <div style={{ padding: '0 22px 20px', borderTop: `1px solid ${is_homogeneous ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}` }}>
          {/* Flag message */}
          {flag_message && (
            <div style={{
              margin: '14px 0 12px',
              padding: '12px 14px',
              background: 'rgba(239,68,68,0.08)',
              borderRadius: 'var(--radius-sm)',
              borderLeft: '3px solid rgba(239,68,68,0.6)',
              fontSize: '0.83rem',
              color: '#fca5a5',
              lineHeight: 1.6,
            }}>
              {flag_message}
            </div>
          )}

          {/* Diversity note */}
          {diversity_note && (
            <p style={{
              fontSize: '0.83rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.65,
              margin: '0 0 14px',
            }}>
              {diversity_note}
            </p>
          )}

          {/* Hidden gem candidate pills */}
          {gemCandidates.length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                Worth a Closer Look
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {gemCandidates.map(c => (
                  <a
                    key={c.candidate_id}
                    href={`#candidate-${c.candidate_id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 12px',
                      borderRadius: 20,
                      background: 'rgba(16,185,129,0.12)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      color: '#6ee7b7',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                    }}
                    onClick={e => {
                      // Scroll to and open the card
                      const el = document.getElementById(`candidate-${c.candidate_id}`);
                      if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
                    }}
                  >
                    💎 #{c.rank} {c.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Build and download a CSV of ranked candidates */
function exportCSV(candidates, jdTitle) {
  const headers = [
    'Rank', 'Name', 'File', 'Email', 'Phone',
    'Total Score', 'Hard Skills', 'Must Have', 'Experience Fit',
    'Soft Skills', 'Domain Knowledge',
    'Gaps', 'Explanation',
  ];

  const rows = candidates.map(c => {
    const sb = c.score_breakdown;
    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return [
      c.rank,
      escape(c.name),
      escape(c.filename),
      escape(c.email),
      escape(c.phone),
      Math.round(sb.total),
      Math.round(sb.hard_skills),
      Math.round(sb.must_have),
      Math.round(sb.experience_fit),
      Math.round(sb.soft_skills),
      Math.round(sb.domain_knowledge),
      escape((c.gaps ?? []).join('; ')),
      escape(c.explanation),
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const safe = (jdTitle || 'results').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  a.href     = url;
  a.download = `RecruitAI_${safe}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ResultsStep({ results, onRestart }) {
  const [filter, setFilter] = useState('all');   // 'all' | 'strong' | 'mid' | 'weak'
  const [sortBy, setSortBy] = useState('rank');  // 'rank' | 'name'
  const [csvFlash, setCsvFlash] = useState(false);

  const candidates = results?.ranked_candidates ?? [];
  const jd         = results?.jd;
  const biasReport = results?.bias_report ?? null;

  const filtered = useMemo(() => {
    let list = [...candidates];

    // Filter by score tier
    if (filter === 'strong') list = list.filter(c => c.score_breakdown.total >= 70);
    if (filter === 'mid')    list = list.filter(c => c.score_breakdown.total >= 40 && c.score_breakdown.total < 70);
    if (filter === 'weak')   list = list.filter(c => c.score_breakdown.total < 40);

    // Sort
    if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else list.sort((a, b) => a.rank - b.rank);

    return list;
  }, [candidates, filter, sortBy]);

  const topScore    = candidates[0]?.score_breakdown.total ?? 0;
  const avgScore    = candidates.length
    ? Math.round(candidates.reduce((s, c) => s + c.score_breakdown.total, 0) / candidates.length)
    : 0;
  const strongCount = candidates.filter(c => c.score_breakdown.total >= 70).length;

  const processingTime = results?.processing_time_seconds
    ? `${results.processing_time_seconds.toFixed(1)}s`
    : '—';

  function handleExport() {
    exportCSV(candidates, jd?.job_title);
    setCsvFlash(true);
    setTimeout(() => setCsvFlash(false), 2000);
  }

  return (
    <div>
      {/* Header */}
      <div className="results-header">
        <div>
          <h2 className="section-title">
            Screening Results
            {jd?.job_title && (
              <span style={{ color: 'var(--accent-1)', fontWeight: 600 }}>
                {' '}— {jd.job_title}
              </span>
            )}
          </h2>
          <p className="section-desc" style={{ marginBottom: 0 }}>
            {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} screened · Processed in {processingTime}
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Export CSV */}
          <button
            id="export-csv-btn"
            onClick={handleExport}
            disabled={candidates.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 18px',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${csvFlash ? 'rgba(16,185,129,0.6)' : 'rgba(16,185,129,0.3)'}`,
              background: csvFlash
                ? 'rgba(16,185,129,0.18)'
                : 'rgba(16,185,129,0.08)',
              color: '#6ee7b7',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: candidates.length === 0 ? 'not-allowed' : 'pointer',
              opacity: candidates.length === 0 ? 0.5 : 1,
              transition: 'all 0.25s',
            }}
          >
            {csvFlash ? '✓ Downloaded!' : '⬇ Export CSV'}
          </button>

          {/* Screen Again */}
          <button
            id="screen-again-btn"
            className="btn btn-ghost"
            onClick={onRestart}
          >
            ↺ Screen Again
          </button>
        </div>
      </div>

      {/* Parsed role details */}
      <RoleDetailsPanel jd={jd} />

      {/* Bias Report */}
      <BiasReportPanel biasReport={biasReport} candidates={candidates} />

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 28,
        }}
      >
        {[
          { label: 'Screened',    value: results?.total_screened ?? candidates.length },
          { label: 'Top Score',   value: `${Math.round(topScore)}` },
          { label: 'Avg Score',   value: `${avgScore}` },
          { label: 'Strong Fits', value: strongCount },
        ].map(s => (
          <div
            key={s.label}
            style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
            }}
          >
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter + Sort toolbar */}
      <div className="flex-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        {/* Filter chips */}
        <div className="flex-row gap-8" style={{ flexWrap: 'wrap' }}>
          {[
            { key: 'all',    label: `All (${candidates.length})` },
            { key: 'strong', label: `Strong ≥70 (${candidates.filter(c=>c.score_breakdown.total>=70).length})` },
            { key: 'mid',    label: `Mid 40–69 (${candidates.filter(c=>c.score_breakdown.total>=40&&c.score_breakdown.total<70).length})` },
            { key: 'weak',   label: `Weak <40 (${candidates.filter(c=>c.score_breakdown.total<40).length})` },
          ].map(f => (
            <button
              key={f.key}
              id={`filter-${f.key}-btn`}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '5px 14px',
                borderRadius: '20px',
                border: `1px solid ${filter === f.key ? 'var(--accent-1)' : 'var(--border)'}`,
                background: filter === f.key ? 'rgba(99,102,241,0.12)' : 'var(--bg-glass)',
                color: filter === f.key ? 'var(--accent-1)' : 'var(--text-secondary)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex-row gap-8">
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sort:</span>
          {[
            { key: 'rank', label: '🏆 Rank' },
            { key: 'name', label: '🔤 Name' },
          ].map(s => (
            <button
              key={s.key}
              id={`sort-${s.key}-btn`}
              onClick={() => setSortBy(s.key)}
              style={{
                padding: '5px 12px',
                borderRadius: '20px',
                border: `1px solid ${sortBy === s.key ? 'var(--accent-3)' : 'var(--border)'}`,
                background: sortBy === s.key ? 'rgba(6,182,212,0.1)' : 'var(--bg-glass)',
                color: sortBy === s.key ? 'var(--accent-3)' : 'var(--text-secondary)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex-row gap-16" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { color: 'var(--score-great)', label: 'Strong ≥75' },
          { color: 'var(--score-good)',  label: 'Good 55–74' },
          { color: 'var(--score-mid)',   label: 'Average 35–54' },
          { color: 'var(--score-low)',   label: 'Weak <35' },
        ].map(l => (
          <div key={l.label} className="flex-row gap-8">
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Candidate list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
          No candidates match this filter.
        </div>
      ) : (
        <div className="candidate-list" id="candidate-list">
          {filtered.map((c, i) => (
            <CandidateCard
              key={c.candidate_id}
              candidate={c}
              style={{ animationDelay: `${i * 0.06}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
