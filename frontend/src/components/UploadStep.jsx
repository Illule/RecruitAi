/**
 * UploadStep.jsx
 * Step 2: Drag-and-drop CV file upload.
 */

import { useState, useRef, useCallback } from 'react';
import { uploadCVs } from '../api';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'pdf') return { emoji: '📕', color: '#ef4444' };
  if (ext === 'docx' || ext === 'doc') return { emoji: '📘', color: '#3b82f6' };
  return { emoji: '📄', color: 'var(--text-muted)' };
}

export default function UploadStep({ parsedJD, onUploaded, onBack }) {
  const [files, setFiles]       = useState([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const inputRef                = useRef(null);
  const dragCounter             = useRef(0);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  function addFiles(newFiles) {
    const valid = Array.from(newFiles).filter(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      return ['pdf', 'docx', 'doc'].includes(ext);
    });
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      const deduped = valid.filter(f => !existing.has(f.name + f.size));
      return [...prev, ...deduped].slice(0, 50);
    });
  }

  function removeFile(idx) { setFiles(prev => prev.filter((_, i) => i !== idx)); }

  const handleDragEnter = useCallback((e) => { e.preventDefault(); e.stopPropagation(); dragCounter.current++; setDragging(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); e.stopPropagation(); dragCounter.current--; if (dragCounter.current === 0) setDragging(false); }, []);
  const handleDragOver = useCallback((e) => { e.preventDefault(); e.stopPropagation(); }, []);

  function handleDrop(e) {
    e.preventDefault(); e.stopPropagation(); dragCounter.current = 0; setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  async function handleUpload() {
    if (!files.length) { setError('Please add at least one CV file.'); return; }
    setError(''); setLoading(true);
    try {
      const result = await uploadCVs(parsedJD, files);
      onUploaded(result.job_id);
    } catch (e) { setError(e.message); setLoading(false); }
  }

  return (
    <div>
      <div className="mb-20">
        <h2 className="section-title">Upload CVs</h2>
        <p className="section-desc" style={{ marginBottom: 0 }}>
          Upload up to 50 PDF or DOCX résumés. Our pipeline will parse and score each one
          against <strong style={{ color: 'var(--text-primary)' }}>{parsedJD?.job_title || 'the role'}</strong>.
        </p>
      </div>

      <div id="cv-dropzone" className={`drop-zone ${dragging ? 'drag-over' : ''}`}
        onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        aria-label="Upload CV files. Click or drag and drop PDF or DOCX files.">
        <input ref={inputRef} type="file" multiple accept=".pdf,.docx,.doc" style={{ display: 'none' }}
          onChange={e => addFiles(e.target.files)} id="cv-file-input" />
        <span className="drop-icon" style={{ transition: 'transform 0.3s var(--ease-out)', transform: dragging ? 'scale(1.2)' : 'scale(1)' }}>
          {dragging ? '📂' : '☁️'}
        </span>
        <div className="drop-text">{dragging ? 'Drop files here' : 'Drag & drop CVs here, or click to browse'}</div>
        <div className="drop-sub">PDF and DOCX supported · Max 10 MB per file · Up to 50 files</div>
        {files.length > 0 && (
          <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 14px', borderRadius: 20, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-1)' }}>
            📎 {files.length} file{files.length !== 1 ? 's' : ''} · {formatBytes(totalSize)}
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="file-list" id="cv-file-list">
          <div className="flex-between" style={{ marginBottom: 8 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{files.length} file{files.length !== 1 ? 's' : ''} selected</span>
            <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={() => setFiles([])}>Clear all</button>
          </div>
          {files.map((f, i) => {
            const fi = fileIcon(f.name);
            return (
              <div className="file-item" key={`${f.name}-${f.size}-${i}`} style={{ animationDelay: `${i * 0.04}s` }}>
                <span className="file-icon" style={{ fontSize: '1.3rem' }}>{fi.emoji}</span>
                <span className="file-name" title={f.name}>{f.name}</span>
                <span className="file-size">{formatBytes(f.size)}</span>
                <button className="file-remove" onClick={e => { e.stopPropagation(); removeFile(i); }} title="Remove" aria-label={`Remove ${f.name}`}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      {error && <div className="error-box">⚠ {error}</div>}

      <div className="flex-row gap-12 mt-24" style={{ justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" onClick={onBack} disabled={loading}>← Back</button>
        <button id="start-screening-btn" className="btn btn-primary btn-lg" onClick={handleUpload} disabled={loading || !files.length}>
          {loading
            ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', marginRight: 8 }}>⏳</span> Uploading…</>
            : `🚀 Start Screening${files.length ? ` (${files.length} CV${files.length !== 1 ? 's' : ''})` : ''}`
          }
        </button>
      </div>
    </div>
  );
}
