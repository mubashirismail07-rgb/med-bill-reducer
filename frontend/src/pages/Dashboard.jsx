import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { Heading, Icon, Alert, Empty, BillsTable } from "../components/UI";
import { money, message } from "../lib/bills";
export default function Dashboard() {
  const [bills, setBills] = useState(null),
    [error, setError] = useState("");
  const load = () => {
    setError("");
    api
      .get("/bills")
      .then((r) => setBills(r.data))
      .catch((e) => setError(message(e)));
  };
  useEffect(() => {
    api
      .get("/bills")
      .then((r) => setBills(r.data))
      .catch((e) => setError(message(e)));
  }, []);
  const totals = {};
  for (const b of bills || [])
    if (b.currency && b.reviewedAt)
      totals[b.currency] =
        (totals[b.currency] || 0) +
        (b.summary.printedTotal ?? b.summary.expectedTotal);
  const done = bills?.filter((b) => b.summary.complete).length || 0,
    attention = bills?.filter((b) => b.summary.needsReview).length || 0;
  return (
    <>
      <Heading
        title="Your bills, made clearer."
        action={
          <Link className="btn primary" to="/upload">
            <Icon name="upload" />
            Upload bill
          </Link>
        }
      >
        A considered look at your medical bills, all in one place.
      </Heading>
      {error && (
        <Alert>
          {error} <button onClick={load}>Retry</button>
        </Alert>
      )}
      {!bills && !error ? (
        <div className="skeleton" role="status">
          Loading your workspace…
        </div>
      ) : (
        bills && (
          <>
            <div className="stats-grid">
              <section className="stat">
                <p>Bills analyzed</p>
                <strong>
                  {done}
                  <small> / {bills.length}</small>
                </strong>
                <span>Completed, reviewed analyses</span>
              </section>
              <section className="stat">
                <p>Total billed</p>
                <div className="currency-totals">
                  {Object.entries(totals).length ? (
                    Object.entries(totals).map(([c, n]) => (
                      <strong key={c}>{money(n, c)}</strong>
                    ))
                  ) : (
                    <strong>—</strong>
                  )}
                </div>
                <span>Reviewed bills · currencies kept separate</span>
              </section>
              <section className="stat">
                <p>Needs review</p>
                <strong>{attention}</strong>
                <span>Incomplete bills or charges to discuss</span>
              </section>
            </div>
            <section className="card">
              <div className="section-heading">
                <div>
                  <h2>Recent bills</h2>
                  <p className="muted">Pick up where you left off.</p>
                </div>
                <Link to="/history" className="text-link">
                  View all bills →
                </Link>
              </div>
              {bills.length ? (
                <BillsTable bills={bills.slice(0, 5)} />
              ) : (
                <Empty />
              )}
            </section>
            <div className="two-column">
              <section className="card">
                <h2>Review progress</h2>
                <p className="muted">Completion across your uploaded bills</p>
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-label="Bills with complete analysis"
                  aria-valuenow={done}
                  aria-valuemin={0}
                  aria-valuemax={bills.length || 1}
                >
                  <span
                    style={{
                      width: `${bills.length ? (done / bills.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <p>
                  {done} complete{" "}
                  <span className="muted">
                    · {bills.length - done} awaiting completion
                  </span>
                </p>
              </section>
              <section className="card sample-card">
                <p className="eyebrow">NO PERSONAL DOCUMENTS NEEDED</p>
                <h2>See what a clearer bill looks like.</h2>
                <p className="muted">
                  Explore a fictional bill with explained charges and example
                  findings.
                </p>
                <Link className="text-link" to="/sample">
                  Try a sample bill <Icon name="arrow" />
                </Link>
              </section>
            </div>
          </>
        )
      )}
    </>
  );
}
