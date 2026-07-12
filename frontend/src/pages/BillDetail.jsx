import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

const Section = ({ title, children, color = "#111827" }) => (
  <div className="card">
    <h2
      style={{
        fontSize: "1.1rem",
        fontWeight: "600",
        color,
        marginBottom: "1rem",
        paddingBottom: "0.5rem",
        borderBottom: "1px solid #f3f4f6",
      }}
    >
      {title}
    </h2>
    {children}
  </div>
);

const BillDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const { data } = await api.get(`/bills/${id}`);
        setBill(data);
      } catch (err) {
        setError("Failed to load bill details");
      } finally {
        setLoading(false);
      }
    };
    fetchBill();
  }, [id]);

  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      const response = await api.get(`/reports/${id}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `MedReduce-Report-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download report");
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this bill?")) return;
    try {
      await api.delete(`/dashboard/bills/${id}`);
      navigate("/history");
    } catch (err) {
      alert("Failed to delete bill");
    }
  };

  if (loading) return <div className="loading">Loading bill details...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!bill) return null;

  const items = bill.parsedData || [];
  const totalAmount = items.reduce((sum, i) => sum + (i.amount || 0), 0);
  const ai = bill.aiAnalysis || {};
  const flags = ai.ruleBasedFlags || {};

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "none",
              border: "none",
              color: "#2563eb",
              cursor: "pointer",
              fontSize: "0.9rem",
              marginBottom: "0.5rem",
              padding: 0,
            }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "700" }}>{bill.fileName}</h1>
          <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
            Uploaded {new Date(bill.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            className="btn btn-primary"
            onClick={handleDownloadReport}
            disabled={downloading}
          >
            {downloading ? "Downloading..." : "Download Report"}
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      {/* Summary banner */}
      {flags.hasIssues && (
        <div className="alert alert-warning" style={{ marginBottom: "1.5rem" }}>
          ⚠️ {flags.totalFlagsFound} issue(s) detected in this bill. Review the sections below.
        </div>
      )}

      {!flags.hasIssues && ai.summary && (
        <div className="alert alert-success" style={{ marginBottom: "1.5rem" }}>
          ✓ No rule-based issues detected in this bill.
        </div>
      )}

      {/* AI Summary */}
      {ai.summary && (
        <Section title="AI Summary">
          <p style={{ color: "#374151", lineHeight: "1.6" }}>{ai.summary}</p>
        </Section>
      )}

      {/* Parsed Line Items */}
      {items.length > 0 && (
        <Section title="Itemized Charges">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td>{item.item}</td>
                  <td style={{ textAlign: "right" }}>${item.amount?.toFixed(2)}</td>
                </tr>
              ))}
              <tr>
                <td style={{ fontWeight: "700" }}>Total</td>
                <td style={{ textAlign: "right", fontWeight: "700", color: "#2563eb" }}>
                  ${totalAmount.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </Section>
      )}

      {/* Charge Explanations */}
      {ai.chargeExplanations && ai.chargeExplanations.length > 0 && (
        <Section title="Charge Explanations">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {ai.chargeExplanations.map((charge, i) => (
              <div
                key={i}
                style={{
                  padding: "0.75rem",
                  background: "#f9fafb",
                  borderRadius: "8px",
                  borderLeft: "3px solid #2563eb",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.25rem",
                  }}
                >
                  <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>
                    {charge.item}
                  </span>
                  <span style={{ color: "#2563eb", fontWeight: "600" }}>
                    ${charge.amount}
                  </span>
                </div>
                <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                  {charge.explanation}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Duplicate Charges */}
      {flags.duplicateCharges && flags.duplicateCharges.length > 0 && (
        <Section title="⚠️ Duplicate Charges" color="#dc2626">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {flags.duplicateCharges.map((flag, i) => (
              <div
                key={i}
                style={{
                  padding: "0.75rem",
                  background: "#fee2e2",
                  borderRadius: "8px",
                  borderLeft: "3px solid #dc2626",
                }}
              >
                <p style={{ fontWeight: "600", fontSize: "0.9rem", color: "#dc2626" }}>
                  {flag.item}
                </p>
                <p style={{ fontSize: "0.85rem", color: "#374151", marginTop: "0.25rem" }}>
                  {flag.message}
                </p>
                <p style={{ fontSize: "0.85rem", color: "#374151" }}>
                  Total charged: ${flag.totalCharged}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Repeated Lab Tests */}
      {flags.repeatedLabTests && flags.repeatedLabTests.length > 0 && (
        <Section title="🔬 Repeated Lab Tests" color="#d97706">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {flags.repeatedLabTests.map((flag, i) => (
              <div
                key={i}
                style={{
                  padding: "0.75rem",
                  background: "#fef3c7",
                  borderRadius: "8px",
                  borderLeft: "3px solid #d97706",
                }}
              >
                <p style={{ fontWeight: "600", fontSize: "0.9rem", color: "#d97706" }}>
                  {flag.item}
                </p>
                <p style={{ fontSize: "0.85rem", color: "#374151", marginTop: "0.25rem" }}>
                  {flag.message}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* High Cost Items */}
      {flags.highCostItems && flags.highCostItems.length > 0 && (
        <Section title="💰 High Cost Items" color="#d97706">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {flags.highCostItems.map((flag, i) => (
              <div
                key={i}
                style={{
                  padding: "0.75rem",
                  background: "#fef3c7",
                  borderRadius: "8px",
                  borderLeft: "3px solid #d97706",
                }}
              >
                <p style={{ fontWeight: "600", fontSize: "0.9rem", color: "#d97706" }}>
                  {flag.item} — ${flag.amount}
                </p>
                <p style={{ fontSize: "0.85rem", color: "#374151", marginTop: "0.25rem" }}>
                  {flag.message}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Suspicious Charges */}
      {ai.suspiciousCharges && ai.suspiciousCharges.length > 0 && (
        <Section title="🚨 Suspicious Charges" color="#dc2626">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {ai.suspiciousCharges.map((charge, i) => (
              <div
                key={i}
                style={{
                  padding: "0.75rem",
                  background: "#fee2e2",
                  borderRadius: "8px",
                  borderLeft: "3px solid #dc2626",
                }}
              >
                <p style={{ fontWeight: "600", fontSize: "0.9rem", color: "#dc2626" }}>
                  {charge.item} — ${charge.amount}
                </p>
                <p style={{ fontSize: "0.85rem", color: "#374151", marginTop: "0.25rem" }}>
                  {charge.reason}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Cost Saving Suggestions */}
      {ai.costSavingSuggestions && ai.costSavingSuggestions.length > 0 && (
        <Section title="💡 Cost-Saving Suggestions" color="#16a34a">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {ai.costSavingSuggestions.map((s, i) => (
              <div
                key={i}
                style={{
                  padding: "0.75rem",
                  background: "#f0fdf4",
                  borderRadius: "8px",
                  borderLeft: "3px solid #16a34a",
                  fontSize: "0.9rem",
                  color: "#374151",
                }}
              >
                ✓ {s}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Questions To Ask */}
      {ai.questionsToAsk && ai.questionsToAsk.length > 0 && (
        <Section title="❓ Questions To Ask Your Provider">
          <ol style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {ai.questionsToAsk.map((q, i) => (
              <li key={i} style={{ fontSize: "0.9rem", color: "#374151", lineHeight: "1.5" }}>
                {q}
              </li>
            ))}
          </ol>
        </Section>
      )}
    </div>
  );
};

export default BillDetail;