# -*- coding: utf-8 -*-
"""
test_pipeline.py
----------------
End-to-end test: parse JD -> upload CVs -> poll -> print ranked results.
Run with: python test_pipeline.py
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import asyncio
import httpx
import json
import time

BASE = "http://localhost:8002"

JD_TEXT = """
We are looking for a Senior Software Engineer with 4+ years of experience.
Required skills: Python, JavaScript, React, Node.js, PostgreSQL, Docker.
Must have: REST API design, CI/CD pipelines, system design experience.
Nice to have: AWS, Kubernetes, TypeScript.
Soft skills: strong communication, problem-solving, teamwork.
Must have a Bachelor's degree in Computer Science or equivalent.
"""

CV_FILES = [
    r"C:\Users\jagga\Downloads\Lakshay resume june 26.pdf",
    r"C:\Users\jagga\Downloads\growth_resume.pdf",
]


async def main():
    async with httpx.AsyncClient(timeout=60) as client:

        # ── Step 1: Upload CVs with raw JD text ──────────────────────────────
        print("=" * 60)
        print("STEP 1 — Uploading CVs + JD text")
        print("=" * 60)

        files = []
        for path in CV_FILES:
            try:
                with open(path, "rb") as f:
                    data = f.read()
                import os
                filename = os.path.basename(path)
                files.append(("files", (filename, data, "application/pdf")))
                print(f"  ✓ Loaded: {filename} ({len(data)/1024:.1f} KB)")
            except FileNotFoundError:
                print(f"  ✗ File not found: {path}")

        if not files:
            print("No CV files found. Aborting.")
            return

        resp = await client.post(
            f"{BASE}/api/cv/upload",
            data={"jd_text": JD_TEXT.strip()},
            files=files,
        )

        if resp.status_code != 200:
            print(f"Upload failed [{resp.status_code}]: {resp.text}")
            return

        upload_result = resp.json()
        job_id = upload_result["job_id"]
        print(f"\n  ✓ Job created: {job_id}")
        print(f"  ✓ Role: {upload_result['job_title']}")
        print(f"  ✓ CVs submitted: {upload_result['total_cvs']}")

        # ── Step 2: Poll for completion ───────────────────────────────────────
        print("\n" + "=" * 60)
        print("STEP 2 — Polling for completion...")
        print("=" * 60)

        start = time.time()
        while True:
            status_resp = await client.get(f"{BASE}/api/jobs/{job_id}/status")
            status = status_resp.json()
            elapsed = round(time.time() - start, 1)
            print(f"  [{elapsed}s] status={status['status']} | progress={status['progress']}%")

            if status["status"] == "completed":
                break
            if status["status"] == "failed":
                print(f"  ✗ Job failed: {status.get('error')}")
                return

            await asyncio.sleep(3)

        # ── Step 3: Fetch and print results ──────────────────────────────────
        print("\n" + "=" * 60)
        print("STEP 3 — Results")
        print("=" * 60)

        results_resp = await client.get(f"{BASE}/api/jobs/{job_id}/results")
        results = results_resp.json()

        print(f"\n  Role: {results['jd']['job_title']}")
        print(f"  Total screened: {results['total_screened']}")
        print(f"  Processing time: {results['processing_time_seconds']}s\n")

        for c in results["ranked_candidates"]:
            sb = c["score_breakdown"]
            print(f"  #{c['rank']}  {c['name']}")
            print(f"      Total Score : {sb['total']}/100")
            print(f"      Hard Skills : {sb['hard_skills']:.0f}  | Must-Have: {sb['must_have']:.0f}  | Exp: {sb['experience_fit']:.0f}  | Soft: {sb['soft_skills']:.0f}  | Domain: {sb['domain_knowledge']:.0f}")
            print(f"      Explanation : {c['explanation']}")
            if c['gaps']:
                print(f"      Gaps        : {', '.join(c['gaps'])}")
            if c['interview_questions']:
                print(f"      Interview Qs:")
                for q in c['interview_questions']:
                    print(f"          - {q}")
            print()

        print("=" * 60)
        print("✅  End-to-end test PASSED")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
