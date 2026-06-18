/**
 * UploadStep.jsx
 * Step 2: Drag-and-drop CV file upload.
 * Calls POST /api/cv/upload and advances to the Processing step.
 */

import { useState, useRef } from 'react';
import { uploadCVs } from '../api';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(name) {
  return name.toLowerCase().endsWith('.pdf') ? '📄' : '📝';
}

export default function UploadStep({ parsedJD, onUploaded, onBack }) {
  const [files, setFiles]       = useState([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const inputRef                = useRef(null);

  function addFiles(newFiles) {
    const valid = Array.from(newFiles).filter(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      return ['pdf', 'docx', 'doc'].includes(ext);
    });
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      const deduped  = valid.filter(f => !existing.has(f.name + f.size));
      return [...prev, ...deduped].slice(0, 50);
    });
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  async function handleUpload() {
    if (!files.length) {
      setError('Please add at least one CV file.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await uploadCVs(parsedJD, files);
      onUploaded(result.job_id);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
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

      {/* Drop zone */}
      <div
        id="cv-dropzone"
        className={`drop-zone ${dragging ? 'drag-over' : ''}`}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc"
          style={{ display: 'none' }}
          onChange={e => addFiles(e.target.files)}
          id="cv-file-input"
        />
        <span className="drop-icon">{dragging ? '📂' : '☁️'}</span>
        <div className="drop-text">
          {dragging ? 'Drop files here' : 'Drag & drop CVs here, or click to browse'}
        </div>
        <div className="drop-sub">PDF and DOCX supported · Max 10 MB per file · Up to 50 files</div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="file-list" id="cv-file-list">
          <div className="flex-between" style={{ marginBottom: 8 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </span>
            <button
              className="btn btn-ghost"
              style={{ padding: '4px 12px', fontSize: '0.75rem' }}
              onClick={() => setFiles([])}
            >
              Clear all
            </button>
          </div>
          {files.map((f, i) => (
            <div className="file-item" key={`${f.name}-${f.size}-${i}`}>
              <span className="file-icon">{fileIcon(f.name)}</span>
              <span className="file-name" title={f.name}>{f.name}</span>
              <span className="file-size">{formatBytes(f.size)}</span>
              <button
                className="file-remove"
                onClick={e => { e.stopPropagation(); removeFile(i); }}
                title="Remove"
                aria-label={`Remove ${f.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <div className="error-box">⚠ {error}</div>}

      <div className="flex-row gap-12 mt-24" style={{ justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" onClick={onBack} disabled={loading}>
          ← Back
        </button>
        <button
          id="start-screening-btn"
          className="btn btn-primary btn-lg"
          onClick={handleUpload}
          disabled={loading || !files.length}
        >
          {loading
            ? '⏳ Uploading…'
            : `🚀 Start Screening${files.length ? ` (${files.length} CV${files.length !== 1 ? 's' : ''})` : ''}`
          }
        </button>
      </div>
    </div>
  );
}
