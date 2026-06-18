/**
 * ProcessingStep.jsx
 * Step 3: Polls GET /api/jobs/{id}/status every 2.5s until done/failed.
 * Shows an animated spinner, progress bar, and per-CV status list.
 */

import { useEffect, useState } from 'react';
import { getJobStatus, getJobResults } from '../api';

const STATUS_ICON = {
  processing: '⚙️',
  done:       '✅',
  error:      '❌',
  pending:    '⏳',
};

export default function ProcessingStep({ jobId, onComplete }) {
  const [status, setStatus]       = useState(null);
  const [error, setError]         = useState('');
  const [elapsed, setElapsed]     = useState(0);

  // Elapsed timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll for status
  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;

    async function poll() {
      while (!cancelled) {
        try {
          const s = await getJobStatus(jobId);
          if (!cancelled) setStatus(s);

          if (s.status === 'completed') {
            // Fetch results then advance
            const results = await getJobResults(jobId);
            if (!cancelled) onComplete(results);
            return;
          }

          if (s.status === 'failed') {
            if (!cancelled) setError(s.error || 'Job failed for an unknown reason.');
            return;
          }
        } catch (e) {
          if (!cancelled) setError(e.message);
          return;
        }

        // Wait 2.5s before next poll
        await new Promise(r => setTimeout(r, 2500));
      }
    }

    poll();
    return () => { cancelled = true; };
  }, [jobId, onComplete]);

  const progress    = status?.progress ?? 0;
  const cvStatuses  = status?.cv_statuses ?? [];
  const statusLabel = status?.status ?? 'starting';

  return (
    <div>
      <div className="mb-20">
        <h2 className="section-title">Screening in Progress</h2>
        <p className="section-desc" style={{ marginBottom: 0 }}>
          The AI is parsing and scoring each résumé. This usually takes 20–60 seconds.
        </p>
      </div>

      <div className="processing-center">
        <div className="spinner-ring" id="processing-spinner" />

        <div style={{ fontSize: '1.05rem', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 4 }}>
          {statusLabel === 'processing' ? 'Analysing candidates…' :
           statusLabel === 'pending'    ? 'Starting pipeline…'   :
           statusLabel === 'completed'  ? 'Finalising results…'  :
           'Preparing…'}
        </div>

        <div className="progress-label">
          {progress}% complete · {elapsed}s elapsed
        </div>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} id="progress-bar" />
        </div>

        {cvStatuses.length > 0 && (
          <div className="cv-status-list" id="cv-status-list">
            {cvStatuses.map((cv, i) => (
              <div className="cv-status-item" key={`${cv.filename}-${i}`}>
                <span className="cv-status-icon">{STATUS_ICON[cv.status] ?? '⏳'}</span>
                <span className="cv-status-name" title={cv.filename}>{cv.filename}</span>
                <span className={`status-badge ${cv.status}`}>{cv.status}</span>
                {cv.error && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--score-low)', marginLeft: 4 }}>
                    {cv.error.slice(0, 60)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="error-box mt-24">⚠ {error}</div>}
    </div>
  );
}
