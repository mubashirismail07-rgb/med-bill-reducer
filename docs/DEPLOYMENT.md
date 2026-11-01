# Deployment: Vercel + Render Docker + Atlas

No production resources were changed during this work. Review and publish the branch yourself when ready. Keep the existing Vercel frontend and Atlas database. Use a Docker web service on Render so Linux PDF/OCR tools are installed explicitly.

## Backend configuration

Copy `backend/.env.example` for local development. Set these in Render's **Environment** panel, never in Git or Docker build arguments:

| Variable | Production value / behavior |
|---|---|
| `MONGO_URI` | Your Atlas connection URI, database name included; URL-encode password characters |
| `JWT_SECRET` | A long random secret; keep the existing value if existing sessions should remain valid |
| `JWT_EXPIRES_IN` | `7d` by default; token lifetime |
| `GROQ_API_KEY` | Your Groq key; missing/unavailable AI leaves a retryable incomplete analysis with rule findings saved |
| `GROQ_MODEL` | `openai/gpt-oss-20b` by default; confirm availability in your Groq account |
| `FRONTEND_URLS` | `https://med-bill-reducer.vercel.app`; comma-separated exact additional preview origins if required |
| `NODE_ENV` | `production` |
| `PORT` | Render supplies it; Docker defaults to `10000`; server binds `0.0.0.0` |
| `MAX_UPLOAD_MB` | `5` |
| `MAX_PDF_PAGES` | `5` |
| `PROCESSING_TIMEOUT_MS` | `120000`; shared deadline across PDF/OCR subprocesses |
| `UPLOAD_RETENTION_HOURS` | `24`; maximum temporary original retention, swept hourly while running |
| `UPLOAD_DIR` | Optional; defaults to `/app/uploads` in Docker; ephemeral by design |
| `HIGH_PRICE_THRESHOLDS` | `{}` disables price flags. Example `{"USD":5000,"INR":100000}` sets personal review cutoffs, **not** price benchmarks |
| `REPORT_FONT_PATH` | `/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf`, installed in Docker |

The only frontend environment variable is `VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`. It is public and baked into the Vite build. Redeploy the frontend after changing it.

## Local verification and Docker build

Use Node 22. On Debian/Ubuntu install `poppler-utils tesseract-ocr tesseract-ocr-eng fonts-dejavu-core` for native local development. English OCR is currently supported.

```sh
cd backend
npm ci
npm test
# An isolated development database is required for running the full app.
npm run dev
```

In a second terminal:

```sh
cd frontend
npm ci
npm run lint
npm run build
npx playwright install chromium
npx playwright test
```

With a working Docker daemon, from the repository root:

```sh
docker build -t medreduce-backend ./backend
docker run --rm --env-file backend/.env -p 5000:10000 -e PORT=10000 medreduce-backend
```

The Dockerfile installs real Linux Poppler and Tesseract binaries, uses the npm lockfile, excludes upload files/secrets, and runs as the unprivileged `node` user. The base OS packages receive current security updates on rebuild; pin an image digest and package snapshot if byte-identical builds are required.

## Render setup

1. Review the feature branch and tests. Push only when you choose to publish; no push or deploy was performed for you.
2. In Render, create a **Web Service**, connect this repository, choose your reviewed branch, select **Docker**, and use **Free** hosting.
3. Leave **Root Directory** blank (repository root), set **Dockerfile Path** to `./backend/Dockerfile`, and Docker build context to `./backend`. Leave the Docker command empty so the image's `CMD` runs. No native Node build/start command is needed.
4. Add the environment variables above. Set the health-check path to `/`. Disable automatic deployment if you want explicit release control.
5. Allow the service's outbound connectivity in Atlas Network Access, and use a database user scoped to the application database. Keep credentials on Render only.
6. Deploy manually and inspect build/runtime logs. Confirm `/` returns JSON, then verify a synthetic text PDF and scanned PDF end to end.
7. Keep the old native Node service until the Docker service passes verification. Point Vercel to the new Render URL, redeploy Vercel, and only retire the old service after confirming the new path. Runtime migration may require a new service; don't delete the old service as a first step.

`backend/render.yaml` describes the same Docker service with explicit repository-relative paths. If using a Blueprint, choose that file as the Blueprint path. Path semantics follow the [Render Blueprint reference](https://render.com/docs/blueprint-spec).

## Vercel setup

Keep the existing project with **Root Directory `frontend`**, framework **Vite**, build command **`npm run build`**, output directory **`dist`**. Set `VITE_API_URL` to the Docker service's public URL with `/api`, then redeploy. Existing `vercel.json` provides SPA route rewrites. Add any chosen preview frontend origins explicitly to `FRONTEND_URLS`; do not use wildcard CORS for authentication.

## Storage and restart behavior

- Originals are private temporary files; there is no public upload directory or original-file viewing endpoint.
- After all pages' text is saved to Atlas, the original is deleted. Failed/abandoned originals expire after the configured retention time; an hourly sweep and startup sweep remove expired files.
- Render can remove ephemeral files earlier on a restart/redeploy. If extraction hasn't finished, use **Reattach original** on the existing bill. This preserves the bill ID instead of adding a second history record.
- Saved pages, parsed rows, review, currency and analysis live in MongoDB. Retry skips completed extraction and complete analysis. Editing charges clears analysis before re-running.
- Processing is request-driven, **not a durable background queue**. One PDF/OCR operation runs at a time per server process; a concurrent request receives a retryable busy error. Pages run sequentially. Keep a single backend instance. In-process locks are not distributed locks.
- A browser disconnect may let a request finish on the server; a server restart interrupts it. Reopen the bill and resume. A crash before a checkpoint can repeat that stage. Free-tier sleeping/cold starts can cause delays.
- No object-storage account or paid disk is required because durable original viewing is deliberately not offered. If adding that feature later, use private object storage with ownership checks and retention rules; don't extend local-disk assumptions.
- Extracted text can contain personal data. Deleting a bill removes its database record and any original remaining on this instance. Atlas backups have their own retention policy. OCR runs locally; only reviewed charge descriptions/amounts, not full source text or originals, are sent to Groq.

## Manual release checklist

- Open `/sample` signed out: fictional label, no API calls, register link works.
- Register/login/logout; a wrong password displays a recoverable error.
- Upload a synthetic PNG, JPEG, text PDF, scanned PDF, and mixed PDF. Confirm each page appears in source text.
- Reject an invalid signature, encrypted PDF, file over 5 MB, and PDF over 5 pages with actionable messages.
- Correct a charge and currency, review discounts/taxes, confirm and analyze. Edit again: old analysis disappears.
- Temporarily omit the Groq key in a test deployment: rule findings remain, analysis stays incomplete, retry works after restoring configuration.
- Refresh during and after processing; resume from history. Restart before extraction and reattach a missing original.
- Confirm currencies have separate totals, and possible duplicates reference the relevant rows.
- Download a multipage report and inspect headers, footer page numbers, amounts and currency codes.
- Use two test accounts: neither can read, mutate, delete or report the other's bill IDs.
- Check phone width, keyboard focus, file picker, empty/error states and deletion cancellation.
