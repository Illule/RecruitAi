"""
routers/jd.py
-------------
API routes for Feature 1: Job Description Parser

POST /api/jd/parse
  - Accepts raw JD text in request body
  - Returns structured ParsedJD with all extracted fields
"""

import logging
from fastapi import APIRouter, HTTPException

from models.jd_models import JDParseRequest, JDParseResponse
from services.jd_parser import parse_jd

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/jd", tags=["Job Description"])


@router.post("/parse", response_model=JDParseResponse)
async def parse_job_description(request: JDParseRequest):
    """
    Parse a free-form job description and extract structured requirements.

    The returned ParsedJD object serves as the scoring rubric for all
    candidates. Store the result on the client and pass it when uploading CVs.
    """
    try:
        parsed = await parse_jd(request.text)
        return JDParseResponse(
            success=True,
            parsed=parsed,
            raw_text_length=len(request.text),
        )
    except ValueError as exc:
        logger.error("JD parse failed: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error parsing JD")
        raise HTTPException(status_code=500, detail=f"Failed to parse job description: {str(exc)}")
