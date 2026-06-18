"""
routers/results.py
------------------
Feature 3: Job Status & Results API

GET /api/jobs/{job_id}/status
  - Returns current JobStatus (progress %, CV statuses, any errors)
  - Poll this every 2–3 seconds until status == "completed"

GET /api/jobs/{job_id}/results
  - Returns the full JobResult with ranked candidates
  - Only available when status == "completed"
  - Each candidate has: score breakdown, explanation, gaps, interview questions
"""

import logging
from fastapi import APIRouter, HTTPException

from models.result_models import JobStatus, JobResult
import storage.session_store as store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/jobs", tags=["Results"])


@router.get("/{job_id}/status", response_model=JobStatus)
async def get_job_status(job_id: str):
    """
    Poll the status of a scoring job.

    Returns progress (0–100), per-CV statuses, and any error messages.
    Keep polling until `status` is `"completed"` or `"failed"`.
    """
    status = store.get_status(job_id)
    if status is None:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    return status


@router.get("/{job_id}/results", response_model=JobResult)
async def get_job_results(job_id: str):
    """
    Retrieve the final ranked results for a completed job.

    Returns a list of candidates ranked by fit score, each with:
    - `score_breakdown`: detailed scores across 5 dimensions
    - `explanation`: why this candidate is a fit
    - `gaps`: missing skills or requirements
    - `interview_questions`: targeted questions to probe the gaps
    """
    status = store.get_status(job_id)
    if status is None:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    if status.status == "failed":
        raise HTTPException(
            status_code=422,
            detail=f"Job '{job_id}' failed: {status.error or 'Unknown error'}",
        )

    if status.status != "completed":
        raise HTTPException(
            status_code=202,
            detail=f"Job '{job_id}' is still {status.status} ({status.progress}% done). Try again shortly.",
        )

    result = store.get_result(job_id)
    if result is None:
        raise HTTPException(status_code=500, detail="Results not found despite completed status.")

    return result
