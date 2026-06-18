"""
services/scorer.py
------------------
Feature 3: Semantic scoring of a single candidate against a job description.

Uses Groq to evaluate the candidate across 5 weighted dimensions:
  - hard_skills     (35%) — technical skill overlap
  - soft_skills     (10%) — interpersonal trait alignment
  - must_have       (30%) — coverage of non-negotiable requirements
  - experience_fit  (15%) — years + seniority level match
  - domain_knowledge(10%) — industry/domain alignment

Also generates per-candidate:
  - explanation        : 2–3 sentence narrative on why the candidate fits
  - gaps               : list of missing/weak areas
  - interview_questions: 3 targeted questions based on the gaps
"""

import logging
from models.cv_models import ParsedCV
from models.jd_models import ParsedJD
from models.result_models import CandidateResult, ScoreBreakdown
from core.groq_client import chat_json

logger = logging.getLogger(__name__)

# ─── Scoring weights ──────────────────────────────────────────────────────────
_WEIGHTS = {
    "hard_skills":      0.35,
    "soft_skills":      0.10,
    "must_have":        0.30,
    "experience_fit":   0.15,
    "domain_knowledge": 0.10,
}

# ─── Prompt templates ─────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are a senior talent acquisition specialist. Your task is to objectively score
a candidate's CV against a job description and return ONLY a valid JSON object.

Return EXACTLY this JSON structure — no extra keys, no markdown, no explanation:

{
  "hard_skills": <0-100>,
  "soft_skills": <0-100>,
  "must_have": <0-100>,
  "experience_fit": <0-100>,
  "domain_knowledge": <0-100>,
  "explanation": "<2-3 sentences: why this candidate is/isn't a strong fit>",
  "gaps": ["<missing or weak area>", ...],
  "interview_questions": ["<targeted question>", "<targeted question>", "<targeted question>"]
}

Scoring guidelines:
- hard_skills     (0-100): % of required technical skills the candidate clearly has
- soft_skills     (0-100): alignment of behavioural traits with JD requirements
- must_have       (0-100): % of non-negotiable requirements the candidate meets
- experience_fit  (0-100): 100 if years and level match perfectly; scale down for gaps
- domain_knowledge(0-100): relevance of candidate's industry background to the role
- gaps: 2-5 concrete missing skills or requirements (empty list if none)
- interview_questions: 3 questions that probe the identified gaps or verify key claims
- Be objective and consistent. Use only the information provided.
- Respond with ONLY the JSON object. No markdown. No explanation.
"""

_USER_PROMPT_TEMPLATE = """\
=== JOB DESCRIPTION (Parsed) ===
Job Title: {job_title}
Experience Required: {experience_years} years ({experience_level})
Hard Skills Required: {hard_skills}
Soft Skills Required: {soft_skills}
Must Have: {must_have}
Nice to Have: {nice_to_have}
Domain Knowledge: {domain_knowledge}

=== CANDIDATE PROFILE ===
Name: {name}
Skills: {skills}
Experience: {experience_years_cv} years
Education: {education}
Tenure: {tenure}
Career Trajectory: {career_trajectory}
Domain Experience: {domain_experience}
"""


# ─── Public API ───────────────────────────────────────────────────────────────

async def score_candidate(cv: ParsedCV, jd: ParsedJD, rank: int = 0) -> CandidateResult:
    """
    Score a single candidate against the job description.

    Args:
        cv:   Parsed candidate profile.
        jd:   Parsed job description (the scoring rubric).
        rank: Placeholder rank (will be re-assigned after sorting).

    Returns:
        CandidateResult with score breakdown, explanation, gaps, and questions.
    """
    logger.info("Scoring candidate '%s' (%s)...", cv.name or cv.filename, cv.candidate_id)

    user_prompt = _USER_PROMPT_TEMPLATE.format(
        job_title=jd.job_title,
        experience_years=jd.experience_years or "Not specified",
        experience_level=jd.experience_level,
        hard_skills=", ".join(jd.hard_skills) or "None specified",
        soft_skills=", ".join(jd.soft_skills) or "None specified",
        must_have=", ".join(jd.must_have) or "None specified",
        nice_to_have=", ".join(jd.nice_to_have) or "None specified",
        domain_knowledge=", ".join(jd.domain_knowledge) or "None specified",
        name=cv.name or cv.filename,
        skills=", ".join(cv.skills) or "Not listed",
        experience_years_cv=cv.experience_years or "Unknown",
        education=cv.education or "Not listed",
        tenure=cv.tenure or "Not listed",
        career_trajectory=cv.career_trajectory or "Not listed",
        domain_experience=", ".join(cv.domain_experience) or "Not listed",
    )

    try:
        raw_dict = await chat_json(
            system_prompt=_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.1,
            max_tokens=1024,
        )
    except ValueError as exc:
        logger.warning("Scoring failed for '%s': %s — assigning zero score", cv.filename, exc)
        raw_dict = {
            "hard_skills": 0, "soft_skills": 0, "must_have": 0,
            "experience_fit": 0, "domain_knowledge": 0,
            "explanation": f"Scoring failed: {exc}",
            "gaps": ["Unable to evaluate"], "interview_questions": [],
        }

    # Extract dimension scores, clamped to [0, 100]
    def _clamp(val, default=0) -> float:
        try:
            return max(0.0, min(100.0, float(val)))
        except (TypeError, ValueError):
            return float(default)

    hard_skills      = _clamp(raw_dict.get("hard_skills"))
    soft_skills      = _clamp(raw_dict.get("soft_skills"))
    must_have        = _clamp(raw_dict.get("must_have"))
    experience_fit   = _clamp(raw_dict.get("experience_fit"))
    domain_knowledge = _clamp(raw_dict.get("domain_knowledge"))

    # Weighted total
    total = (
        hard_skills      * _WEIGHTS["hard_skills"] +
        soft_skills      * _WEIGHTS["soft_skills"] +
        must_have        * _WEIGHTS["must_have"] +
        experience_fit   * _WEIGHTS["experience_fit"] +
        domain_knowledge * _WEIGHTS["domain_knowledge"]
    )

    breakdown = ScoreBreakdown(
        hard_skills=hard_skills,
        soft_skills=soft_skills,
        must_have=must_have,
        experience_fit=experience_fit,
        domain_knowledge=domain_knowledge,
        total=round(total, 1),
    )

    result = CandidateResult(
        candidate_id=cv.candidate_id,
        rank=rank,
        name=cv.name or cv.filename,
        filename=cv.filename,
        email=cv.email or "",
        phone=cv.phone or "",
        score_breakdown=breakdown,
        explanation=raw_dict.get("explanation", ""),
        gaps=raw_dict.get("gaps", []),
        interview_questions=raw_dict.get("interview_questions", []),
    )

    logger.info(
        "Scored '%s' → total=%.1f (hard=%.0f, must=%.0f, exp=%.0f)",
        result.name, breakdown.total, hard_skills, must_have, experience_fit,
    )

    return result
