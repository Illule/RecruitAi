"""
services/cv_parser.py
---------------------
Feature 2: LLM-based CV structured parsing.

Uses Groq to extract a structured candidate profile from raw CV text.
The output (ParsedCV) is stored in the session store and used for scoring.

Extracts:
  - name, email, phone
  - skills (flat list)
  - experience_years (float)
  - education
  - tenure          : summary of job tenure (e.g. "3 companies / avg 2.1 yrs")
  - career_trajectory: progression narrative (e.g. "Junior Dev → Senior Dev")
  - domain_experience: industry/domain verticals the candidate has worked in
"""

import logging
from models.cv_models import ParsedCV
from core.groq_client import chat_json

logger = logging.getLogger(__name__)

# ─── Prompt templates ─────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are an expert HR analyst and structured data extractor.
Your task is to parse a candidate's CV/resume and return ONLY a valid JSON object.

Return EXACTLY this JSON structure — no extra keys, no markdown, no explanation:

{
  "name": "<candidate full name or empty string>",
  "email": "<email address or empty string>",
  "phone": "<phone number or empty string>",
  "skills": ["<skill>", ...],
  "experience_years": <float or null>,
  "education": "<highest qualification, field, institution or empty string>",
  "tenure": "<summary like '3 companies / avg 2.1 yrs' or empty string>",
  "career_trajectory": "<progression like 'Junior Dev → Senior Dev → Tech Lead' or empty string>",
  "domain_experience": ["<industry or domain>", ...]
}

Rules:
- skills: all technical tools, languages, frameworks, and platforms mentioned
- experience_years: total professional experience in years (float), or null if unclear
- education: format as "<Degree> in <Field>, <Institution>" where available
- tenure: estimate from job dates if available; note how many companies and average tenure
- career_trajectory: list roles in chronological order separated by →
- domain_experience: industries the candidate has worked in (e.g. FinTech, Healthcare, E-commerce)
- All string fields default to empty string "" if not found
- All array fields default to [] if nothing found
- Respond with ONLY the JSON object. No markdown. No explanation.
"""

_USER_PROMPT_TEMPLATE = """\
Parse the following CV/resume and return the structured JSON:

---
{cv_text}
---
"""


# ─── Public API ───────────────────────────────────────────────────────────────

async def parse_cv(filename: str, raw_text: str, candidate_id: str) -> ParsedCV:
    """
    Parse raw CV text into a structured ParsedCV object using Groq.

    Args:
        filename:     Original filename (stored for reference).
        raw_text:     Extracted text content of the CV.
        candidate_id: UUID assigned to this candidate.

    Returns:
        ParsedCV with all fields populated.

    Raises:
        ValueError: If Groq doesn't return valid JSON.
    """
    logger.info("Parsing CV '%s' (%d chars)...", filename, len(raw_text))

    # Truncate very long CVs to avoid token limits (keep first ~6000 chars)
    text_for_llm = raw_text[:6000] if len(raw_text) > 6000 else raw_text

    user_prompt = _USER_PROMPT_TEMPLATE.replace("{cv_text}", text_for_llm.strip())

    try:
        raw_dict = await chat_json(
            system_prompt=_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.0,
            max_tokens=1024,
        )
    except ValueError as exc:
        logger.warning("Groq failed to parse CV '%s': %s — using empty profile", filename, exc)
        # Return a minimal ParsedCV with error flagged rather than crashing the batch
        return ParsedCV(
            candidate_id=candidate_id,
            filename=filename,
            raw_text=raw_text,
            parse_error=str(exc),
        )

    # Build the ParsedCV, merging LLM output with our metadata
    parsed = ParsedCV(
        candidate_id=candidate_id,
        filename=filename,
        raw_text=raw_text,
        name=raw_dict.get("name", ""),
        email=raw_dict.get("email", ""),
        phone=raw_dict.get("phone", ""),
        skills=raw_dict.get("skills", []),
        experience_years=raw_dict.get("experience_years"),
        education=raw_dict.get("education", ""),
        tenure=raw_dict.get("tenure", ""),
        career_trajectory=raw_dict.get("career_trajectory", ""),
        domain_experience=raw_dict.get("domain_experience", []),
    )

    logger.info(
        "CV parsed → name='%s' | skills=%d | exp=%.1f yrs",
        parsed.name or filename,
        len(parsed.skills),
        parsed.experience_years or 0.0,
    )

    return parsed
