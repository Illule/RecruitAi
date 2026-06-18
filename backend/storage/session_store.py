"""
storage/session_store.py
------------------------
In-memory store for background job state and results.

Keyed by job_id (UUID). Holds:
  - JobStatus   → progress tracking
  - JobResult   → final ranked output
  - ParsedJD    → the JD used for scoring
  - List[ParsedCV] → all parsed candidates

Thread-safe for FastAPI's async context (single-process dev server).
"""

import uuid
from typing import Optional
from models.result_models import JobStatus, JobResult
from models.jd_models import ParsedJD
from models.cv_models import ParsedCV


# ─── In-memory stores ─────────────────────────────────────────────────────────
_job_statuses: dict[str, JobStatus] = {}
_job_results:  dict[str, JobResult] = {}
_job_jds:      dict[str, ParsedJD]  = {}
_job_cvs:      dict[str, list[ParsedCV]] = {}


# ─── Job creation ─────────────────────────────────────────────────────────────

def create_job(total_cvs: int) -> str:
    job_id = str(uuid.uuid4())
    _job_statuses[job_id] = JobStatus(
        job_id=job_id,
        status="pending",
        progress=0,
        total_cvs=total_cvs,
    )
    _job_results[job_id] = JobResult(job_id=job_id)
    _job_cvs[job_id] = []
    return job_id


# ─── Status helpers ───────────────────────────────────────────────────────────

def get_status(job_id: str) -> Optional[JobStatus]:
    return _job_statuses.get(job_id)


def update_status(job_id: str, **kwargs) -> None:
    status = _job_statuses.get(job_id)
    if status:
        for key, value in kwargs.items():
            setattr(status, key, value)


def increment_progress(job_id: str) -> None:
    status = _job_statuses.get(job_id)
    if status and status.total_cvs > 0:
        status.processed_cvs += 1
        status.progress = int((status.processed_cvs / status.total_cvs) * 90)


# ─── JD helpers ───────────────────────────────────────────────────────────────

def store_jd(job_id: str, jd: ParsedJD) -> None:
    _job_jds[job_id] = jd


def get_jd(job_id: str) -> Optional[ParsedJD]:
    return _job_jds.get(job_id)


# ─── CV helpers ───────────────────────────────────────────────────────────────

def add_cv(job_id: str, cv: ParsedCV) -> None:
    _job_cvs.setdefault(job_id, []).append(cv)


def get_cvs(job_id: str) -> list[ParsedCV]:
    return _job_cvs.get(job_id, [])


# ─── Result helpers ───────────────────────────────────────────────────────────

def store_result(job_id: str, result: JobResult) -> None:
    _job_results[job_id] = result


def get_result(job_id: str) -> Optional[JobResult]:
    return _job_results.get(job_id)
