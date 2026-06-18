/**
 * JDStep.jsx
 * Step 1: User pastes a job description and clicks "Continue".
 * Parsing happens automatically and invisibly — no manual "Parse JD" step needed.
 */

import { useState } from 'react';
import { parseJD } from '../api';

export default function JDStep({ onParsed }) {
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleContinue() {
    const trimmed = text.trim();
    if (trimmed.length < 50) {
      setError('Please enter a more complete job description (at least 50 characters).');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await parseJD(trimmed);
      onParsed(result.parsed, trimmed);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-20">
        <h2 className="section-title">Job Description</h2>
        <p className="section-desc" style={{ marginBottom: 0 }}>
          Paste the full job posting below. The AI will automatically extract skills,
          requirements, and scoring criteria before you upload CVs.
        </p>
      </div>

      <label className="form-label" htmlFor="jd-input">Job Description Text</label>
      <textarea
        id="jd-input"
        className="field"
        rows={12}
        value={text}
        onChange={e => { setText(e.target.value); setError(''); }}
        placeholder="Paste your job description here — include required skills, experience, responsibilities, and any must-have requirements…"
        disabled={loading}
      />

      {error && <div className="error-box">⚠ {error}</div>}

      <div className="flex-row mt-24" style={{ justifyContent: 'flex-end' }}>
        <button
          id="jd-continue-btn"
          className="btn btn-primary btn-lg"
          disabled={loading || !text.trim()}
          onClick={handleContinue}
        >
          {loading
            ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', marginRight: 8 }}>⏳</span> Analysing JD…</>
            : 'Continue to Upload →'
          }
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Extracting skills, requirements, and scoring rubric from your JD…
        </div>
      )}
    </div>
  );
}
