# Verification record

Verified locally on 2026-11-01. Changes are on `feature/portfolio-polish`; no push, merge, deployment, or production database modification was performed. Existing working-tree edits were used as the starting point. The existing local PEM file was not read or modified and is now covered by ignore rules.

## Results

| Check | Result |
|---|---|
| Backend tests | 17 passed, 0 failed, 0 skipped in the final full run |
| Real OCR/PDF tests | JPEG, PNG, embedded-text PDF, scanned pages, mixed document and mixed-content page passed |
| Failure paths | Invalid signatures/type mismatch, size/page limits, encrypted/corrupt PDFs, timeout cleanup and concurrency rejection passed |
| Parsing | Address/date/invoice exclusions, quantities/unit price/line total, adjustments, unknown/conflicting currencies and conflicting printed totals passed |
| State/rules | Review gate, invalidation, retry, legacy incomplete status, union of affected charge IDs and currency-specific thresholds passed |
| HTTP integration | Local Express server; stubbed User/Bill models; upload content checks, authenticated ownership, report response and deletion passed |
| File lifecycle | Expiry removes stale originals, retains fresh files, refuses out-of-directory deletion |
| Frontend lint | Passed |
| Frontend production build | Passed; Vite 8.3.5, 94 transformed modules |
| Browser tests | 5 passed: account/file-picker accessibility, sample isolation, dashboard/history/upload, empty/loading/error/login failure, review/refresh/retry without duplicate upload |
| Visual review | Desktop and 390px mobile screenshots inspected; mobile history uses cards, reports inspected as rendered PNGs |
| Reports | Synthetic USD multipage report (7 pages), INR and AED examples generated; wrapping, repeated headers, footer and currency codes reviewed |
| Docker | Not run: Docker Desktop WSL integration unavailable; `docker version` reports Docker unavailable in this distro |
| Live deployment | Not run; no Render/Vercel/Atlas production changes |

Local real-PDF tests used Poppler 26.01.0 and Tesseract 5.5.0 binaries extracted under `/tmp/medreduce-tools`, with English trained data. These are **not** a successful Docker build or a Render memory/load test. The Dockerfile uses Debian Bookworm's maintained package versions, which can differ.

On this WSL environment the verification command was:

```sh
PATH=/tmp/medreduce-tools/root/usr/bin:$PATH \
LD_LIBRARY_PATH=/tmp/medreduce-tools/root/usr/lib/x86_64-linux-gnu \
TESSDATA_PREFIX=/tmp/medreduce-tools/root/usr/share/tesseract-ocr/5/tessdata \
npm test
```

For browser tests, `LD_LIBRARY_PATH` pointed to the same temporary library directory. Normally installed OS packages remove the need for these local overrides. Tests start a fresh Vite server on port 5174 to avoid stale filesystem-watch caches.

## Test-isolation correction

An early HTTP integration run revealed that importing the Express app loaded the developer's local `.env`. This caused **one Groq call containing synthetic test charge data**, contrary to the intended no-live-AI test constraint. No real patient data or database calls were involved: database model methods were stubbed. This was disclosed during the work. Environment loading now occurs only on normal server startup, the test explicitly empties the API key, and an external-network guard permits only localhost requests. The final passing run did not use live AI.

## Dependency audit

Backend audit: zero vulnerabilities after compatible patches and replacing nodemon with Node's built-in watch mode. Frontend production dependency audit: zero vulnerabilities. The full frontend development audit retains six moderate reports in ESLint's minimatch dependency chain; upstream audit reports no compatible fix. No forced breaking downgrade or suppression was applied.

## Preview artifacts

Generated files are ignored by Git and can be regenerated with the browser suite and `node backend/tests/render-samples.js`:

- `artifacts/dashboard-desktop.png`, `dashboard-mobile.png`
- `artifacts/sample-desktop.png`, `sample-mobile.png`
- `artifacts/upload-desktop.png`, `upload-mobile.png`
- `artifacts/review-desktop.png`, `analysis-error-mobile.png`
- `artifacts/dashboard-empty.png`, `dashboard-loading.png`, `dashboard-error.png`
- `artifacts/login-desktop.png`, `login-mobile.png`, `register-desktop.png`, `register-mobile.png`
- `artifacts/history-desktop.png`, `history-mobile.png`, `upload-selected-mobile.png`
- `artifacts/report-USD.pdf`, `report-INR.pdf`, `report-AED.pdf`

## Remaining verification and limitations

Run the Docker build and deployed checklist in [DEPLOYMENT.md](DEPLOYMENT.md) before publishing. Authentication/database integration was not tested against Atlas. Groq production reliability and free-tier memory/latency have not been established. Browser API fixtures intentionally isolate UI behavior; they are not live backend end-to-end tests. OCR output, non-English documents, unusual table layouts and clinical/financial interpretation still require human review. The app offers no currency conversion, durable original viewing or crash-proof background queue.
