# MedReduce AI

A medical-bill review workspace built with React, Express and MongoDB. Upload a PDF or image, review extracted charges, reconcile the bill total, and prepare questions for your provider.

**Existing deployment:** https://med-bill-reducer.vercel.app · **New isolated demo route:** `/sample` (available after deploying this branch).

This branch is a portfolio upgrade; the existing production deployment has not been changed. Findings are review prompts, not confirmed billing errors or guaranteed savings.

## What's included

- PDF, PNG and JPEG processing with content validation, conservative limits and actionable errors.
- Page-by-page PDF text extraction with Poppler; scanned or mixed-content pages use native Tesseract OCR after Sharp preprocessing.
- Saved extraction/review checkpoints, retry/resume, refresh recovery and reattachment when an ephemeral original is missing.
- Editable charge descriptions, quantities, unit prices, line totals, currency, printed total, taxes and discounts before analysis.
- Separate printed totals and extracted sums, discrepancy notices, and currency-separated dashboard totals.
- Deterministic possible-duplicate/configured-threshold findings, separate validated AI suggestions, and links to charges and source pages.
- A responsive dashboard, upload/review flow, searchable history, accessible account screens and a fictional precomputed sample requiring no account or API calls.
- PDFKit reports with long-description wrapping, repeated table headers, page numbers and explicit currency codes.
- Docker deployment configuration for Render, retaining Vercel and MongoDB Atlas.

## Stack

React 19, Vite, React Router, Axios, plain CSS; Node 22, Express, Mongoose, JWT/bcrypt; Poppler, native Tesseract and Sharp; Groq; PDFKit with DejaVu Sans. No Redis, durable job queue, paid storage service or framework migration.

## Run locally

Use Node 22 and an isolated development database. Copy `backend/.env.example` to `backend/.env`, and `frontend/.env.example` to `frontend/.env`. Supply your own backend credentials. Never put a secret in a `VITE_*` variable.

On Debian/Ubuntu, install `poppler-utils tesseract-ocr tesseract-ocr-eng fonts-dejavu-core`, or use the backend Dockerfile.

```sh
cd backend
npm ci
npm run dev
```

In another terminal:

```sh
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173/sample` for the isolated demo. The sample needs only the frontend; real uploads need the backend/database. Missing Groq credentials leave AI analysis incomplete with saved rule findings and a retry action.

## Verify

```sh
cd backend
npm test
node tests/render-samples.js
```

```sh
cd frontend
npm run lint
npm run build
npx playwright install chromium
npx playwright test
```

Tests use synthetic documents and stubbed database/API interactions, never real patient records or live AI calls. Real Poppler/Tesseract tests require the installed binaries. Browser tests cover sample isolation, review/retry, loading/error/empty states, and mobile overflow. Generated screenshots and sample PDFs are local artifacts under `artifacts/` and are ignored by Git.

See [verification notes](docs/VERIFICATION.md), [deployment steps and environment variables](docs/DEPLOYMENT.md), and [architecture/interview guide](docs/ARCHITECTURE.md).

## Important limits

Defaults: 5 MB, 5 PDF pages, 120-second PDF/OCR deadline, one OCR job per backend process, sequential pages. OCR is English-only and sensitive to scan quality. The parser deliberately flags uncertain lines; it is not a universal invoice parser. Confirm all charges against the source.

Processing is request-driven, not a durable background queue. A server restart can interrupt a stage. Saved MongoDB checkpoints survive; unsaved work may repeat. Keep one backend instance. Originals are private temporary files, deleted after text extraction or on expiry; a restart may remove them sooner. Reattach a missing original to the same bill. No durable original-viewing feature is promised.

Old records remain readable without silently assigning a currency or treating old AI/rule objects as complete. Review them to use the new analysis pipeline. Multi-currency bills must be split or reconciled externally; there is no exchange-rate conversion.

A deployed smoke test is still required for Render memory/latency, Atlas connectivity, authentication and Groq availability. Local tests do not establish production compatibility.
