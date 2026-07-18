# MedReduce AI

An AI-powered medical bill analysis platform that helps patients understand, verify, and question their hospital bills.

🔗 **Live Demo:** https://med-bill-reducer.vercel.app

---

## What it does

Upload a photo of your hospital bill and MedReduce AI will:

- Extract the text using OCR
- Parse it into structured line items
- Explain each charge in plain language using AI
- Detect duplicate and suspicious charges
- Flag abnormally high costs
- Suggest cost-saving actions
- Generate questions you can ask your hospital or insurance provider
- Produce a downloadable PDF report

---

## Tech Stack

**Frontend**
- React.js + Vite
- React Router
- Axios
- Recharts
- Plain CSS

**Backend**
- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication + Bcrypt

**AI / OCR**
- Tesseract.js (OCR)
- Sharp (image preprocessing)
- Groq API / Llama3 (AI analysis)

**Report Generation**
- PDFKit

**Deployment**
- Frontend → Vercel
- Backend → Render
- Database → MongoDB Atlas

---

## Features

- **User Authentication** — register, login, protected routes via JWT
- **Bill Upload** — PNG and JPG support with file validation
- **OCR Pipeline** — image preprocessing with Sharp before Tesseract reads it
- **Parsing Engine** — converts raw OCR text into structured JSON line items
- **AI Analysis** — plain-language charge explanations, duplicate detection, cost-saving suggestions, and patient questions via Groq/Llama3
- **Rule-Based Engine** — deterministic checks for duplicate charges, repeated lab tests, abnormally high costs, and missing descriptions
- **Dashboard** — total spend, flag counts, average bill amount, recent bills chart
- **Bill History** — filter by analysis status, delete bills
- **PDF Reports** — downloadable reports with full analysis breakdown

---

## How to Use

1. Register or log in at the live link
2. Click **Upload Bill**
3. Upload a clear PNG or JPG photo of your hospital bill
4. Wait for the automatic analysis to complete (~15-30 seconds)
5. View the full breakdown — charges, flags, AI suggestions, questions to ask
6. Download your PDF report

---

## Running Locally

### Prerequisites
- Node.js
- MongoDB running locally
- Groq API key (free at console.groq.com)

### Backend
```bash
cd backend
npm install
```

Create `backend/.env`:
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/medreduce
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
GROQ_API_KEY=your_groq_key
```

```bash
node server.js
```

### Frontend
```bash
cd frontend
npm install
```

Create `frontend/.env`:
```
VITE_API_URL=http://localhost:5000/api
```

```bash
npm run dev
```

---

## Known Limitations

- **PDF uploads are not supported** in the current deployment. PDF OCR requires Poppler, a system-level dependency not available on the free hosting tier. Planned upgrade: replace Tesseract with Google Vision API or AWS Textract, which handle PDFs natively with no system dependencies.
- OCR accuracy depends on image quality. Clear, well-lit photos of printed bills work best. Handwritten or low-resolution scans may produce incomplete results.
- The Render free tier spins down after 15 minutes of inactivity. The first request after inactivity may take 30-60 seconds to respond.

---

## Planned Upgrades

- PDF support via Google Vision API or AWS Textract
- Cloudinary or AWS S3 for persistent file storage
- Bill comparison across multiple uploads
- Insurance coverage estimation
- Chat with your bill (conversational Q&A on uploaded bills)
- Multi-language support