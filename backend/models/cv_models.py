"""
models/cv_models.py
-------------------
Pydantic schemas for CV / candidate data.
"""

from pydantic import BaseModel, Field
from typing import Optional


class ParsedCV(BaseModel):
    """Structured candidate profile extracted from a CV by the LLM."""
    candidate_id: str
    filename: str
    name: str = ""
    email: str = ""
    phone: str = ""
    skills: list[str] = Field(default_factory=list)
    experience_years: Optional[float] = None
    education: str = ""
    tenure: str = Field(default="", description="e.g. '3 companies / avg 2.1 yrs'")
    career_trajectory: str = Field(default="", description="e.g. 'Junior Dev → Senior Dev → Tech Lead'")
    domain_experience: list[str] = Field(default_factory=list)
    raw_text: str = Field(default="", description="Original extracted text (not sent to client)")
    parse_error: Optional[str] = None


class CVUploadStatus(BaseModel):
    filename: str
    status: str  # "pending" | "processing" | "done" | "error"
    error: Optional[str] = None
