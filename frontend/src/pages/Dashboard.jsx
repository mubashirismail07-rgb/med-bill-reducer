import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import api from "../services/api";

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, historyRes] = await Promise.all([
          api.get("/dashboard/stats"),
          api.get("/dashboard/history"),
        ]);
        setStats(statsRes.data);
        setHistory(historyRes.data.bills.slice(0, 5)); // latest 5
      } catch (err) {
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  const chartData = [
    { name: "Total Bills", value: stats.totalBills },
    { name: "Flags Found", value: stats.totalFlagsFound },
    { name: "Duplicates", value: stats.totalDuplicatesFound },
    { name: "Suspicious", value: stats.totalSuspiciousFound },
  ];

  const chartColors = ["#2563eb", "#dc2626", "#d97706", "#9333ea"];

  const getStatusBadge = (status) => {
    const map = {
      complete: "badge badge-green",
      parsed: "badge badge-blue",
      extracted: "badge badge-yellow",
      uploaded: "badge badge-gray",
    };
    return map[status] || "badge badge-gray";
  };

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "700" }}>Dashboard</h1>
        <p style={{ color: "#6b7280", marginTop: "0.25rem" }}>
          Overview of your medical bill analyses
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalBills}</div>
          <div className="stat-label">Total Bills</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${stats.totalSpent.toLocaleString()}</div>
          <div className="stat-label">Total Spent</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "#dc2626" }}>
            {stats.totalFlagsFound}
          </div>
          <div className="stat-label">Issues Found</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "#d97706" }}>
            {stats.totalDuplicatesFound}
          </div>
          <div className="stat-label">Duplicates Detected</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${stats.averageBillAmount.toLocaleString()}</div>
          <div className="stat-label">Avg Bill Amount</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Chart */}
        <div className="card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1.25rem" }}>
            Analysis Overview
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={chartColors[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick actions */}
        <div className="card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1.25rem" }}>
            Quick Actions
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <Link to="/upload">
              <button className="btn btn-primary" style={{ width: "100%" }}>
                Upload New Bill
              </button>
            </Link>
            <Link to="/history">
              <button className="btn btn-gray" style={{ width: "100%" }}>
                View Full History
              </button>
            </Link>
          </div>

          {stats.mostRecentBill && (
            <div style={{ marginTop: "1.5rem" }}>
              <p style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "0.5rem" }}>
                Most Recent Bill
              </p>
              <Link
                to={`/bills/${stats.mostRecentBill._id}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    padding: "0.75rem",
                    background: "#f3f4f6",
                    borderRadius: "8px",
                    fontSize: "0.9rem",
                    color: "#2563eb",
                    cursor: "pointer",
                  }}
                >
                  {stats.mostRecentBill.fileName}
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent bills table */}
      {history.length > 0 && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h2 style={{ fontSize: "1.1rem", fontWeight: "600" }}>Recent Bills</h2>
            <Link to="/history" style={{ fontSize: "0.85rem", color: "#2563eb" }}>
              View all →
            </Link>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Flags</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {history.map((bill) => (
                <tr key={bill._id}>
                  <td>{bill.fileName}</td>
                  <td>${bill.totalAmount.toLocaleString()}</td>
                  <td>
                    <span className={getStatusBadge(bill.analysisStatus)}>
                      {bill.analysisStatus}
                    </span>
                  </td>
                  <td>
                    {bill.flagCount > 0 ? (
                      <span className="badge badge-red">{bill.flagCount} issues</span>
                    ) : (
                      <span className="badge badge-green">Clean</span>
                    )}
                  </td>
                  <td>{new Date(bill.uploadDate).toLocaleDateString()}</td>
                  <td>
                    <Link
                      to={`/bills/${bill._id}`}
                      style={{ color: "#2563eb", fontSize: "0.85rem" }}
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {history.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
            No bills uploaded yet
          </p>
          <Link to="/upload">
            <button className="btn btn-primary">Upload Your First Bill</button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default Dashboard;