import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { Heading, Alert, Icon } from "../components/UI";
import { message } from "../lib/bills";
export default function Upload() {
  const [file, setFile] = useState(null),
    [limits, setLimits] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [drag, setDrag] = useState(false);
  const picker = useRef(),
    navigate = useNavigate();
  useEffect(() => {
    api
      .get("/bills/limits")
      .then((r) => setLimits(r.data))
      .catch((e) => setError(message(e)));
  }, []);
  const choose = (f) => {
    setError("");
    if (!f) return;
    if (
      !/\.(pdf|png|jpe?g)$/i.test(f.name) ||
      !["application/pdf", "image/png", "image/jpeg"].includes(f.type)
    ) {
      setError("Choose a PDF, PNG, or JPEG file.");
      return;
    }
    if (limits && f.size > limits.maxBytes) {
      setError(
        `This file exceeds ${limits.maxBytes / 1048576} MB. Split or compress it.`,
      );
      return;
    }
    setFile(f);
  };
  const upload = async () => {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("bill", file);
      const { data } = await api.post("/bills/upload", form);
      navigate(`/bills/${data.bill._id}?start=1`);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Heading title="Start with your bill." eyebrow="UPLOAD & UNDERSTAND">
        A few simple steps from document to a more informed conversation.
      </Heading>
      <ol className="steps">
        <li className="active">
          1 <span>Upload</span>
        </li>
        <li>
          2 <span>Read bill</span>
        </li>
        <li>
          3 <span>Extract charges</span>
        </li>
        <li>
          4 <span>Analyze</span>
        </li>
        <li>
          5 <span>Complete</span>
        </li>
      </ol>
      <div className="upload-layout">
        <section className="card">
          {error && <Alert>{error}</Alert>}
          <div
            className={`dropzone ${drag ? "dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              if (!busy) choose(e.dataTransfer.files[0]);
            }}
          >
            <span className="upload-icon">
              <Icon name="upload" />
            </span>
            <h2>{file ? file.name : "Drop your bill here"}</h2>
            <p className="muted">
              {file
                ? `${(file.size / 1024).toFixed(0)} KB · ${file.type}`
                : "or choose a file from your device"}
            </p>
            <label className="btn secondary file-label">
              {file ? "Replace file" : "Choose file"}
              <input
                ref={picker}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                disabled={busy}
                onChange={(e) => choose(e.target.files[0])}
              />
            </label>
            <p className="file-help">
              PDF, JPG or PNG ·{" "}
              {limits
                ? `${limits.maxBytes / 1048576} MB maximum · ${limits.maxPages} PDF pages`
                : "Loading server limits…"}
            </p>
          </div>
          {file && (
            <div className="actions">
              <button
                className="btn primary"
                onClick={upload}
                disabled={busy || !limits}
              >
                {busy ? "Uploading…" : "Upload and read bill"}
                <Icon name="arrow" />
              </button>
              <button
                className="quiet"
                disabled={busy}
                onClick={() => {
                  setFile(null);
                  picker.current.value = "";
                }}
              >
                Remove file
              </button>
            </div>
          )}
          <p className="caption">
            You’ll review extracted charges before analysis. English-language
            OCR is supported.
          </p>
        </section>
        <aside>
          <section className="card">
            <p className="eyebrow">WHAT HAPPENS NEXT</p>
            <h2>Review first. Then understand.</h2>
            <ul className="explain-list">
              <li>
                <strong>Read every page</strong>
                <p>Text is extracted directly or read using OCR.</p>
              </li>
              <li>
                <strong>Keep you in control</strong>
                <p>Check amounts, currency and totals before continuing.</p>
              </li>
              <li>
                <strong>Prepare better questions</strong>
                <p>Review rule findings and separate AI suggestions.</p>
              </li>
            </ul>
          </section>
          <div className="privacy-note">
            Original uploads are temporary and removed after text extraction, or
            within {limits?.retentionHours || 24} hours while the server runs.
            Saved text and results stay in your account until you delete the
            bill.
          </div>
          <Link className="text-link" to="/sample">
            Just exploring? Try a sample bill →
          </Link>
        </aside>
      </div>
    </>
  );
}
