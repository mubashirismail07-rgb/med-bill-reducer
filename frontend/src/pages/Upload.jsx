import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const STEPS = ["Upload", "Extract", "Parse", "Analyze", "Rule Check", "Done"];

const Upload = () => {
  const [file, setFile] = useState(null);
  const [billId, setBillId] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatus, setStepStatus] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const updateStep = (step, status, message) => {
    setStepStatus((prev) => ({ ...prev, [step]: { status, message } }));
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) setFile(selected);
  };

  const runFullFlow = async () => {
    if (!file) return setError("Please select a file first");
    setError("");
    setLoading(true);

    try {
      // Step 1 — Upload
      setCurrentStep(1);
      updateStep(1, "loading", "Uploading file...");
      const formData = new FormData();
      formData.append("bill", file);
      const uploadRes = await api.post("/bills/upload", formData);
      const id = uploadRes.data.bill._id;
      setBillId(id);
      updateStep(1, "done", "File uploaded");

      // Step 2 — Extract
      setCurrentStep(2);
      updateStep(2, "loading", "Running OCR extraction...");
      await api.post(`/bills/${id}/extract`);
      updateStep(2, "done", "Text extracted");

      // Step 3 — Parse
      setCurrentStep(3);
      updateStep(3, "loading", "Parsing bill data...");
      await api.post(`/bills/${id}/parse`);
      updateStep(3, "done", "Bill parsed");

      // Step 4 — AI Analyze
      setCurrentStep(4);
      updateStep(4, "loading", "Running AI analysis (this may take a few seconds)...");
      await api.post(`/bills/${id}/analyze`);
      updateStep(4, "done", "AI analysis complete");

      // Step 5 — Rule Check
      setCurrentStep(5);
      updateStep(5, "loading", "Running rule-based checks...");
      await api.post(`/bills/${id}/rule-check`);
      updateStep(5, "done", "Rule checks complete");

      // Done
      setCurrentStep(6);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (stepNum) => {
    const s = stepStatus[stepNum];
    if (!s) return "○";
    if (s.status === "loading") return "⟳";
    if (s.status === "done") return "✓";
    if (s.status === "error") return "✗";
    return "○";
  };

  const getStepColor = (stepNum) => {
    const s = stepStatus[stepNum];
    if (!s) return "#9ca3af";
    if (s.status === "loading") return "#2563eb";
    if (s.status === "done") return "#16a34a";
    if (s.status === "error") return "#dc2626";
    return "#9ca3af";
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "0.5rem" }}>
        Upload a Bill
      </h1>
      <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
        Upload your hospital bill and we'll automatically extract, parse, and analyze it.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      {/* File Upload Area */}
      {currentStep === 0 && (
        <div className="card">
          <div
            style={{
              border: "2px dashed #d1d5db",
              borderRadius: "10px",
              padding: "2.5rem",
              textAlign: "center",
              cursor: "pointer",
              background: file ? "#f0fdf4" : "#f9fafb",
              borderColor: file ? "#16a34a" : "#d1d5db",
            }}
            onClick={() => document.getElementById("fileInput").click()}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>
              {file ? "📄" : "⬆️"}
            </div>
            <p style={{ fontWeight: "500", marginBottom: "0.25rem" }}>
              {file ? file.name : "Click to select a file"}
            </p>
            <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>
              PDF, PNG, or JPG — max 10MB
            </p>
            <input
              id="fileInput"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </div>

          {file && (
            <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={runFullFlow}
                disabled={loading}
              >
                Start Analysis
              </button>
              <button
                className="btn btn-gray"
                onClick={() => setFile(null)}
                disabled={loading}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Progress Steps */}
      {currentStep > 0 && currentStep < 6 && (
        <div className="card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1.5rem" }}>
            Processing your bill...
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: getStepColor(step),
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.9rem",
                    fontWeight: "700",
                    flexShrink: 0,
                  }}
                >
                  {getStepIcon(step)}
                </div>
                <div>
                  <p style={{ fontWeight: "500", fontSize: "0.9rem" }}>
                    {STEPS[step]}
                  </p>
                  {stepStatus[step] && (
                    <p style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      {stepStatus[step].message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Done */}
      {currentStep === 6 && (
        <div className="card" style={{ textAlign: "center", padding: "2.5rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem" }}>
            Analysis Complete!
          </h2>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
            Your bill has been fully analyzed. View the results below.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/bills/${billId}`)}
            >
              View Analysis
            </button>
            <button
              className="btn btn-gray"
              onClick={() => {
                setFile(null);
                setBillId(null);
                setCurrentStep(0);
                setStepStatus({});
              }}
            >
              Upload Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Upload;