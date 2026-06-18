/**
 * api.js
 * Typed wrappers around every backend endpoint.
 */

const BASE = 'http://localhost:8002';

/**
 * POST /api/jd/parse
 * @param {string} text  Raw job description text
 * @returns {Promise<{success: boolean, parsed: object, raw_text_length: number}>}
 */
export async function parseJD(text) {
  const res = await fetch(`${BASE}/api/jd/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to parse job description');
  }
  return res.json();
}

/**
 * POST /api/cv/upload
 * @param {object} parsedJD  The ParsedJD object from parseJD()
 * @param {File[]} files     Array of File objects (PDF/DOCX)
 * @returns {Promise<{job_id: string, total_cvs: number, job_title: string}>}
 */
export async function uploadCVs(parsedJD, files) {
  const form = new FormData();
  form.append('jd', JSON.stringify(parsedJD));
  for (const file of files) {
    form.append('files', file);
  }
  const res = await fetch(`${BASE}/api/cv/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to upload CVs');
  }
  return res.json();
}

/**
 * GET /api/jobs/{job_id}/status
 * @param {string} jobId
 * @returns {Promise<{status: string, progress: number, cv_statuses: object[]}>}
 */
export async function getJobStatus(jobId) {
  const res = await fetch(`${BASE}/api/jobs/${jobId}/status`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to get job status');
  }
  return res.json();
}

/**
 * GET /api/jobs/{job_id}/results
 * @param {string} jobId
 * @returns {Promise<object>}  Full JobResult
 */
export async function getJobResults(jobId) {
  const res = await fetch(`${BASE}/api/jobs/${jobId}/results`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to get job results');
  }
  return res.json();
}
