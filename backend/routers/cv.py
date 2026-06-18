"""
routers/cv.py
-------------
Feature 2: CV Upload API

POST /api/cv/upload
  - Accepts multipart/form-data:
      jd      : (Optional) JSON string of a ParsedJD object
      jd_text : (Optional) Raw text of a JD to be parsed inline
      files   : 1–50 PDF or DOCX files
  - Creates a job in the session store
  - Stores the JD against the job
  - Kicks off the background scoring pipeline
  - Returns { job_id, total_cvs, status_url } immediately

The client should then poll GET /api/jobs/{job_id}/status for progress.
"""

import json
import logging
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from typing import Optional
from pydantic import ValidationError

from models.jd_models import ParsedJD
from services.jd_parser import parse_jd
from services.ranker import run_scoring_pipeline
import storage.session_store as store
from core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/cv", tags=["CV Upload"])

_ALLOWED_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/octet-stream",  # some browsers send this for .docx
}
_MAX_FILE_SIZE_MB = 10


@router.post("/upload")
async def upload_cvs(
    background_tasks: BackgroundTasks,
    jd: Optional[str] = Form(None, description="ParsedJD JSON string from /api/jd/parse"),
    jd_text: Optional[str] = Form(None, description="Raw job description text to parse inline"),
    files: list[UploadFile] = File(..., description="PDF or DOCX CV files (max 50)"),
):
    """
    Upload CVs for a job and start the background scoring pipeline.

    Provide either `jd` (as a JSON string) or `jd_text` (raw text).

    **files**: One or more PDF/DOCX files. Max 50 files, 10 MB each.

    Returns a `job_id` to poll for status and results.
    """
    # ── Validate/Parse JD ─────────────────────────────────────────────────────
    if not jd and not jd_text:
        raise HTTPException(
            status_code=422,
            detail="You must provide either 'jd' (pre-parsed JSON) or 'jd_text' (raw JD text).",
        )

    parsed_jd: ParsedJD
    if jd:
        # Option A: caller already parsed the JD via /api/jd/parse
        try:
            jd_data = json.loads(jd)
            parsed_jd = ParsedJD(**jd_data)
        except (json.JSONDecodeError, ValidationError) as exc:
            raise HTTPException(status_code=422, detail=f"Invalid JD JSON: {exc}")
    else:
        # Option B: raw text — parse it now via the same LLM pipeline
        try:
            logger.info("Parsing raw JD text inline (%d chars)...", len(jd_text))
            parsed_jd = await parse_jd(jd_text)
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Failed to parse JD text: {exc}")

    # ── Validate file count ───────────────────────────────────────────────────
    if not files:
        raise HTTPException(status_code=422, detail="At least one CV file is required.")
    if len(files) > settings.max_cvs_per_batch:
        raise HTTPException(
            status_code=422,
            detail=f"Max {settings.max_cvs_per_batch} files per batch. Got {len(files)}.",
        )

    # ── Read and validate files ───────────────────────────────────────────────
    loaded: list[tuple[str, bytes]] = []
    for upload in files:
        filename = upload.filename or "unknown"
        ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

        if ext not in ("pdf", "docx", "doc"):
            raise HTTPException(
                status_code=422,
                detail=f"File '{filename}' has unsupported type. Only PDF and DOCX allowed.",
            )

        file_bytes = await upload.read()
        size_mb = len(file_bytes) / (1024 * 1024)
        if size_mb > _MAX_FILE_SIZE_MB:
            raise HTTPException(
                status_code=422,
                detail=f"File '{filename}' is {size_mb:.1f} MB — max is {_MAX_FILE_SIZE_MB} MB.",
            )

        loaded.append((filename, file_bytes))

    # ── Create job ────────────────────────────────────────────────────────────
    job_id = store.create_job(total_cvs=len(loaded))
    store.store_jd(job_id, parsed_jd)

    logger.info("Job %s created — %d CVs for role '%s'",
                job_id, len(loaded), parsed_jd.job_title)

    # ── Launch background pipeline ────────────────────────────────────────────
    background_tasks.add_task(run_scoring_pipeline, job_id, loaded)

    return {
        "job_id": job_id,
        "total_cvs": len(loaded),
        "job_title": parsed_jd.job_title,
        "status_url": f"/api/jobs/{job_id}/status",
        "results_url": f"/api/jobs/{job_id}/results",
        "message": "CVs uploaded. Use status_url to track progress.",
    }
