"""
services/jd_parser.py
---------------------
Feature 1: Job Description Parser

Uses Groq LLM to extract structured requirements from any free-form JD text.
The output (ParsedJD) becomes the scoring rubric applied to every candidate.

Extracts:
  - hard_skills      : technical/tool skills required
  - soft_skills      : interpersonal / behavioural traits
  - must_have        : non-negotiable requirements
  - nice_to_have     : preferred-but-optional items
  - experience_level : Junior / Mid-level / Senior / Lead / Principal
  - experience_years : minimum years required (int or None)
  - domain_knowledge : industry domains (e.g. FinTech, ML, Healthcare)
  - job_title        : inferred job title
  - summary          : one-paragraph plain-English role summary
"""

import logging
from models.jd_models import ParsedJD
from core.groq_client import chat_json

logger = logging.getLogger(__name__)

# ─── Prompt templates ─────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are a senior talent acquisition specialist and structured data extractor.
Your job is to parse job descriptions and return ONLY a valid JSON object.

Return EXACTLY this JSON structure — no extra keys, no markdown, no explanation:

{
  "job_title": "<inferred job title>",
  "summary": "<one paragraph plain-English summary of the role>",
  "hard_skills": ["<skill>", ...],
  "soft_skills": ["<trait>", ...],
  "must_have": ["<non-negotiable requirement>", ...],
  "nice_to_have": ["<preferred but optional>", ...],
  "experience_level": "<Junior|Mid-level|Senior|Lead|Principal>",
  "experience_years": <integer or null>,
  "domain_knowledge": ["<industry or domain>", ...]
}

Rules:
- hard_skills: specific technologies, languages, frameworks, tools (e.g. Python, Docker, AWS)
- soft_skills: interpersonal traits (e.g. Communication, Leadership, Problem-solving)
- must_have: requirements explicitly marked as required/essential/mandatory
- nice_to_have: requirements marked as preferred/bonus/nice-to-have
- experience_level: infer from the JD if not explicit
- experience_years: extract the minimum years stated, or null if not mentioned
- domain_knowledge: industry verticals or technical domains (e.g. FinTech, ML, Distributed Systems)
- All arrays must have at least one item if applicable, or be empty []
- Respond with ONLY the JSON object. No markdown fences. No explanation.
"""

_USER_PROMPT_TEMPLATE = """\
Parse the following job description and return the structured JSON:

---
{jd_text}
---
"""


# ─── Public API ───────────────────────────────────────────────────────────────

async def parse_jd(jd_text: str) -> ParsedJD:
    """
    Parse a raw job description text into a structured ParsedJD object.

    Args:
        jd_text: Raw job description text (any format).

    Returns:
        ParsedJD with all fields populated by the LLM.

    Raises:
        ValueError: If the LLM response cannot be parsed as valid JSON.
    """
    logger.info("Parsing JD (%d chars)...", len(jd_text))

    user_prompt = _USER_PROMPT_TEMPLATE.replace("{jd_text}", jd_text.strip())

    raw_dict = await chat_json(
        system_prompt=_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        temperature=0.0,
        max_tokens=1024,
    )

    # Validate and coerce into our Pydantic model
    parsed = ParsedJD(**raw_dict)

    logger.info(
        "JD parsed → title='%s' | hard_skills=%d | must_have=%d",
        parsed.job_title,
        len(parsed.hard_skills),
        len(parsed.must_have),
    )

    return parsed
