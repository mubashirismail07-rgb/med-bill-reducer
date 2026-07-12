import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

const History = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await api.get("/dashboard/history");
        setBills(data.bills);
      } catch (err) {
        setError("Failed to load bill history");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this bill?")) return;
    try {
      await api.delete(`/dashboard/bills/${id}`);
      setBills((prev) => prev.filter((b) => b._id !== id));
    } catch (err) {
      alert("Failed to delete bill");
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      complete: "badge badge-green",
      parsed: "badge badge-blue",
      extracted: "badge badge-yellow",
      uploaded: "badge badge-gray",
    };
    return map[status] || "badge badge-gray";
  };

  const filtered =
    filter === "all" ? bills : bills.filter((b) => b.analysisStatus === filter);

  if (loading) return <div className="loading">Loading history...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "700" }}>Bill History</h1>
          <p style={{ color: "#6b7280", marginTop: "0.25rem" }}>
            {bills.length} bill{bills.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link to="/upload">
          <button className="btn btn-primary">Upload New Bill</button>
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {["all", "complete", "parsed", "extracted", "uploaded"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="btn"
            style={{
              background: filter === f ? "#2563eb" : "#e5e7eb",
              color: filter === f ? "white" : "#374151",
              padding: "0.4rem 0.9rem",
              fontSize: "0.85rem",
              textTransform: "capitalize",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
            {filter === "all" ? "No bills uploaded yet" : `No bills with status "${filter}"`}
          </p>
          {filter === "all" && (
            <Link to="/upload">
              <button className="btn btn-primary">Upload Your First Bill</button>
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filtered.map((bill) => (
            <div
              key={bill._id}
              className="card"
              style={{ cursor: "pointer", marginBottom: 0 }}
              onClick={() => navigate(`/bills/${bill._id}`)}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      background: "#dbeafe",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.2rem",
                      flexShrink: 0,
                    }}
                  >
                    {bill.fileType === "pdf" ? "📄" : "🖼️"}
                  </div>
                  <div>
                    <p style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                      {bill.fileName}
                    </p>
                    <p style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.15rem" }}>
                      {new Date(bill.uploadDate).toLocaleDateString()} ·{" "}
                      {bill.itemCount} item{bill.itemCount !== 1 ? "s" : ""} · $
                      {bill.totalAmount.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className={getStatusBadge(bill.analysisStatus)}>
                    {bill.analysisStatus}
                  </span>
                  {bill.flagCount > 0 ? (
                    <span className="badge badge-red">{bill.flagCount} issues</span>
                  ) : (
                    <span className="badge badge-green">Clean</span>
                  )}
                  <Link
                    to={`/bills/${bill._id}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: "#2563eb", fontSize: "0.85rem" }}
                  >
                    View →
                  </Link>
                  <button
                    className="btn btn-danger"
                    style={{ padding: "0.3rem 0.7rem", fontSize: "0.8rem" }}
                    onClick={(e) => handleDelete(bill._id, e)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;