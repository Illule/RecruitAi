"""
main.py
-------
FastAPI application entry point.

Registers all routers and configures:
  - CORS (allows React dev server at localhost:5173)
  - Logging
  - Auto-generated docs at /docs
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import jd, cv, results

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI-Augmented Recruitment Platform",
    description="Screen CVs semantically. Surface the ones that matter. Explain why.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(jd.router)
app.include_router(cv.router)
app.include_router(results.router)


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "message": "Recruitment Platform API is running"}


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}
