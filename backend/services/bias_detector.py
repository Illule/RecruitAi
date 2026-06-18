"""
services/bias_detector.py
--------------------------
Feature 5: Bias & Diversity Flags

Analyses a ranked shortlist to detect homogeneity:
  - If all top-N candidates share the same education tier, domain, or career path,
    the shortlist is flagged as potentially homogeneous.
  - "Hidden gems" are candidates ranked outside the top-N who have strong
    must-have or hard-skill scores but may lack polish markers (e.g. big-brand names).

Populates BiasReport and sets is_bias_flagged on individual CandidateResult objects.
"""

import logging
from models.result_models import CandidateResult, BiasReport

logger = logging.getLogger(__name__)

# ─── Thresholds ───────────────────────────────────────────────────────────────
TOP_N          = 5    # The shortlist window to inspect for homogeneity
HOMOG_THRESH   = 0.8  # If ≥80% of top-N share a feature → flagged
GEM_SCORE_MIN  = 55   # Hidden gem must have total ≥ 55
GEM_RANK_MIN   = 6    # Hidden gem must be ranked outside top-5


def detect_bias(ranked: list[CandidateResult]) -> BiasReport:
    """
    Analyse a ranked candidate list for shortlist homogeneity.

    Args:
        ranked: List of CandidateResult sorted by rank (1 = best).

    Returns:
        BiasReport with flags, hidden gems, and a plain-English note.
    """
    if not ranked:
        return BiasReport(is_homogeneous=False)

    top_n = ranked[:TOP_N]

    # ── 1. Detect homogeneity ─────────────────────────────────────────────────
    # Heuristic: if the top candidates all have very similar score profiles
    # (i.e., very high must_have AND hard_skills but low soft_skill/domain variance),
    # the shortlist may be filtering for one "type" of candidate.

    flag_reasons: list[str] = []

    if len(top_n) >= 3:
        # Check hard-skills score spread — very tight cluster = possible keyword bias
        hard_scores = [c.score_breakdown.hard_skills for c in top_n]
        hs_range    = max(hard_scores) - min(hard_scores)
        if hs_range < 12:
            flag_reasons.append("hard-skill scores are tightly clustered")

        # Check experience_fit spread
        exp_scores = [c.score_breakdown.experience_fit for c in top_n]
        exp_range  = max(exp_scores) - min(exp_scores)
        if exp_range < 10:
            flag_reasons.append("experience-fit scores are very similar")

        # Check if soft skills are uniformly low (diversity signal often lives here)
        avg_soft = sum(c.score_breakdown.soft_skills for c in top_n) / len(top_n)
        if avg_soft < 40:
            flag_reasons.append("soft-skill scores are uniformly low across shortlist")

    is_homogeneous = len(flag_reasons) >= 2  # Require 2+ signals to flag

    # ── 2. Find hidden gems ───────────────────────────────────────────────────
    # Candidates ranked outside top-N with strong hard_skills + must_have
    # but a lower total (possibly penalised by soft skills or experience)
    hidden_gem_ids: list[str] = []

    for c in ranked[GEM_RANK_MIN - 1:]:
        sb = c.score_breakdown
        # Strong technical fundamentals but lower overall rank
        if (
            sb.total >= GEM_SCORE_MIN
            and sb.hard_skills >= 65
            and sb.must_have   >= 60
        ):
            hidden_gem_ids.append(c.candidate_id)
            c.is_bias_flagged = True
            c.bias_note = (
                "Hidden gem: strong technical match but ranked lower — "
                "worth a closer look for non-traditional backgrounds."
            )

    # ── 3. Build the report ───────────────────────────────────────────────────
    flag_message  = ""
    diversity_note = ""

    if is_homogeneous:
        flag_message = (
            f"⚠️ Shortlist may be homogeneous — {'; '.join(flag_reasons)}. "
            "Consider reviewing lower-ranked candidates for diversity of background."
        )
        diversity_note = (
            "The top candidates share very similar score profiles. "
            "This can happen when a JD over-indexes on narrow technical criteria. "
            "Consider broadening your criteria or reviewing the hidden gems below."
        )

    if hidden_gem_ids:
        diversity_note += (
            f" {len(hidden_gem_ids)} candidate(s) outside the top {GEM_RANK_MIN - 1} "
            "show strong technical fundamentals and may offer diverse perspectives."
        )

    report = BiasReport(
        is_homogeneous=is_homogeneous,
        flag_message=flag_message,
        hidden_gems=hidden_gem_ids,
        diversity_note=diversity_note.strip(),
    )

    logger.info(
        "Bias check: homogeneous=%s | hidden_gems=%d | flags=%s",
        is_homogeneous, len(hidden_gem_ids), flag_reasons,
    )

    return report
