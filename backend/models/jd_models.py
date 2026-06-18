"""
models/jd_models.py
-------------------
Pydantic schemas for Job Description data.
"""

from pydantic import BaseModel, Field
from typing import Optional


class JDParseRequest(BaseModel):
    text: str = Field(..., min_length=50, description="Raw job description text")


class ParsedJD(BaseModel):
    """Structured JD extracted by the LLM — becomes the scoring rubric."""
    hard_skills: list[str] = Field(default_factory=list)
    soft_skills: list[str] = Field(default_factory=list)
    must_have: list[str] = Field(default_factory=list)
    nice_to_have: list[str] = Field(default_factory=list)
    experience_level: str = Field(default="Mid-level", description="e.g. Junior, Mid-level, Senior, Lead")
    experience_years: Optional[int] = Field(default=None, description="Minimum years of experience required")
    domain_knowledge: list[str] = Field(default_factory=list, description="Industry/domain areas (e.g. FinTech, ML)")
    job_title: str = Field(default="", description="Inferred job title from the JD")
    summary: str = Field(default="", description="One-paragraph summary of the role")


class JDParseResponse(BaseModel):
    success: bool
    parsed: ParsedJD
    raw_text_length: int
