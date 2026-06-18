"""
models/result_models.py
-----------------------
Pydantic schemas for scoring results, explanations, and job status.
"""

from pydantic import BaseModel, Field
from typing import Optional
from models.jd_models import ParsedJD
from models.cv_models import ParsedCV, CVUploadStatus


class ScoreBreakdown(BaseModel):
    hard_skills:     float = Field(ge=0, le=100)
    soft_skills:     float = Field(ge=0, le=100)
    must_have:       float = Field(ge=0, le=100)
    experience_fit:  float = Field(ge=0, le=100)
    domain_knowledge: float = Field(ge=0, le=100)
    total:           float = Field(ge=0, le=100)


class CandidateResult(BaseModel):
    candidate_id: str
    rank: int
    name: str
    filename: str
    email: str = ""
    phone: str = ""
    score_breakdown: ScoreBreakdown
    explanation: str = Field(default="", description="Why this candidate fits")
    gaps: list[str] = Field(default_factory=list, description="Missing requirements")
    interview_questions: list[str] = Field(default_factory=list)
    is_bias_flagged: bool = False
    bias_note: str = ""


class BiasReport(BaseModel):
    is_homogeneous: bool
    flag_message: str = ""
    hidden_gems: list[str] = Field(default_factory=list, description="Candidate IDs of non-traditional strong fits")
    diversity_note: str = ""


class JobStatus(BaseModel):
    job_id: str
    status: str  # "pending" | "processing" | "completed" | "failed"
    progress: int = Field(ge=0, le=100, description="0–100 percentage")
    total_cvs: int = 0
    processed_cvs: int = 0
    cv_statuses: list[CVUploadStatus] = Field(default_factory=list)
    error: Optional[str] = None


class JobResult(BaseModel):
    job_id: str
    jd: Optional[ParsedJD] = None
    ranked_candidates: list[CandidateResult] = Field(default_factory=list)
    bias_report: Optional[BiasReport] = None
    total_screened: int = 0
    processing_time_seconds: Optional[float] = None
