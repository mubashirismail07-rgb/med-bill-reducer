import { useEffect, useState, useRef } from "react";
import {
  Link,
  useParams,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import api from "../services/api";
import { Heading, Alert, Badge } from "../components/UI";
import ChargeReview from "../components/ChargeReview";
import { sample, money, date, message } from "../lib/bills";
export default function BillDetail({ demo = false }) {
  const { id } = useParams(),
    navigate = useNavigate(),
    [params, setParams] = useSearchParams();
  const [bill, setBill] = useState(demo ? sample : null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(false);
  const started = useRef(false);
  const run = async (action) => {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(`/bills/${id}/${action}`);
      setBill(data.bill);
    } catch (e) {
      setError(message(e));
      try {
        const { data } = await api.get(`/bills/${id}`);
        setBill(data);
      } catch {
        /* Keep the last successful checkpoint visible. */
      }
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (demo) return;
    let active = true;
    api
      .get(`/bills/${id}`)
      .then((r) => {
        if (active) setBill(r.data);
      })
      .catch((e) => {
        if (active) setError(message(e));
      });
    return () => {
      active = false;
    };
  }, [id, demo]);
  useEffect(() => {
    if (demo || !bill || params.get("start") !== "1" || started.current) return;
    started.current = true;
    setParams({}, { replace: true });
    Promise.resolve().then(() => run("process"));
  }, [bill, demo, params, setParams]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!busy || demo) return;
    let active = true;
    const timer = setInterval(
      () =>
        api
          .get(`/bills/${id}`)
          .then((r) => {
            if (active) setBill(r.data);
          })
          .catch(() => {}),
      1800,
    );
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [busy, id, demo]);
  const save = async (body) => {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.put(`/bills/${id}/review`, body);
      setBill(data.bill);
      setEditing(false);
      await run("analyze");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  const report = async () => {
    try {
      const { data } = await api.get(`/reports/${id}`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "MedReduce-report.pdf";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(message(e));
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/bills/${id}`);
      navigate("/history");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  if (!bill)
    return (
      <>
        {error ? (
          <Alert>
            {error}{" "}
            <button onClick={() => window.location.reload()}>Retry</button>
          </Alert>
        ) : (
          <div className="skeleton" role="status">
            Loading your bill…
          </div>
        )}
      </>
    );
  const s = bill.summary,
    stage = bill.processing?.stage || bill.summary.stage,
    failed = bill.processing?.failedStage;
  const step =
    stage === "complete"
      ? 4
      : stage === "analyze" || failed === "analyze"
        ? 3
        : stage === "review" || stage === "extract" || failed === "extract"
          ? 2
          : 1;
  const findings = [...(s.ruleFindings || []), ...(s.suggestions || [])];
  const flagged = new Set(findings.flatMap((f) => f.rowIds));
  return (
    <>
      {demo && (
        <Alert type="info">
          <strong>Fictional sample · precomputed results</strong> No real
          patient data, live OCR or AI request. This example stays separate from
          your account. <Link to="/register">Create an account →</Link>
        </Alert>
      )}
      <Heading
        title={demo ? "A clearer view of your bill." : "Bill analysis"}
        eyebrow={demo ? "EXPLORE MEDREDUCE" : "DOCUMENT WORKSPACE"}
        action={
          !demo && (
            <button
              className="btn secondary"
              onClick={report}
              disabled={!bill.parsedData.length || busy}
            >
              Download report
            </button>
          )
        }
      >
        {bill.fileName} · {date(bill.createdAt)}
      </Heading>
      {error && <Alert>{error}</Alert>}
      {!demo && (
        <ol className="steps" aria-label="Processing stages">
          {[
            "Upload",
            "Read bill",
            "Extract charges",
            "Analyze",
            "Complete",
          ].map((label, i) => (
            <li
              key={label}
              className={i < step ? "done" : i === step ? "active" : ""}
            >
              {i + 1}
              <span>
                {label}
                {i === step && stage === "failed" ? " · failed" : ""}
                {i === 2 && stage === "review" ? " · review required" : ""}
              </span>
            </li>
          ))}
        </ol>
      )}
      {stage === "failed" && (
        <Alert>{bill.processing.message} Completed work is saved.</Alert>
      )}
      {busy && (
        <Alert type="info">
          {stage === "analyze"
            ? "Analyzing reviewed charges…"
            : stage === "extract"
              ? "Extracting charges…"
              : "Reading bill…"}{" "}
          You can return to this bill from history. Keep this tab open while
          processing.
        </Alert>
      )}
      {!demo && !busy && stage !== "complete" && stage !== "review" && (
        <div className="actions">
          <button
            className="btn primary"
            onClick={() => run(bill.reviewedAt ? "analyze" : "process")}
          >
            {bill.reviewedAt ? "Retry / resume analysis" : "Read / resume bill"}
          </button>
          <Link className="btn secondary" to="/upload">
            Select another file
          </Link>
          {!bill.extractedText && !bill.reviewedAt && (
            <label className="btn secondary file-label">
              Reattach original
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={async (e) => {
                  const f = e.target.files[0];
                  if (!f) return;
                  setBusy(true);
                  try {
                    const form = new FormData();
                    form.append("bill", f);
                    const { data } = await api.post(
                      `/bills/${id}/original`,
                      form,
                    );
                    setBill(data.bill);
                    setError("");
                  } catch (err) {
                    setError(message(err));
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
          )}
        </div>
      )}
      <div className="stats-grid bill-stats">
        <section className="stat">
          <p>Printed bill total</p>
          <strong>{money(s.printedTotal, bill.currency)}</strong>
          <span>As shown on the source bill</span>
        </section>
        <section className="stat">
          <p>Extracted charge sum</p>
          <strong>{money(s.lineTotal, bill.currency)}</strong>
          <span>Adjustments: {money(s.adjustments, bill.currency)}</span>
        </section>
        <section className="stat">
          <p>Review status</p>
          <Badge bill={bill} />
          <span>{s.affectedCharges} distinct charges flagged</span>
        </section>
      </div>
      {s.discrepancy !== null && Math.abs(s.discrepancy) > 0.01 && (
        <Alert type="warning">
          Totals differ by {money(s.discrepancy, bill.currency)} (charges +
          adjustments − printed total). Check missing charges, discounts and
          taxes.
        </Alert>
      )}
      {!demo && (stage === "review" || editing) && (
        <ChargeReview
          key={bill.revision || 0}
          bill={bill}
          onSave={save}
          busy={busy}
        />
      )}
      <nav className="section-nav" aria-label="Bill sections">
        <a href="#charges">Charges</a>
        <a href="#findings">Findings</a>
        <a href="#questions">Questions</a>
        <a href="#source">Source text</a>
      </nav>
      <section className="card" id="charges">
        <div className="section-heading">
          <div>
            <h2>Itemized charges</h2>
            <p className="muted">
              Every amount, with a place to start asking questions.
            </p>
          </div>
          {!demo && bill.parsedData.length > 0 && (
            <button
              className="btn secondary small"
              disabled={busy}
              onClick={() => setEditing(!editing)}
            >
              {editing ? "Close editor" : "Review / edit charges"}
            </button>
          )}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Charge</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Amount</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {bill.parsedData.map((r, i) => (
                <tr
                  id={r.id || `row-${i + 1}`}
                  key={r.id || i}
                  className={flagged.has(r.id) ? "flagged" : ""}
                >
                  <td>
                    <strong>{r.item}</strong>
                    {flagged.has(r.id) && (
                      <a href="#findings" className="row-note">
                        Flagged for discussion →
                      </a>
                    )}
                  </td>
                  <td>{r.quantity ?? "—"}</td>
                  <td>{money(r.unitPrice, bill.currency)}</td>
                  <td>{money(r.amount, bill.currency)}</td>
                  <td>
                    {r.page ? (
                      <a href={`#source-${r.page}`}>Page {r.page}</a>
                    ) : (
                      "Not recorded"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!bill.parsedData.length && (
          <p className="muted">
            No charge rows yet. Read the bill, then add missing rows in review.
          </p>
        )}
        <div className="table-total">
          <span>Charges + adjustments</span>
          <strong>{money(s.expectedTotal, bill.currency)}</strong>
        </div>
      </section>
      <div className="two-column" id="findings">
        <section className="card">
          <p className="eyebrow">DETERMINISTIC CHECKS</p>
          <h2>
            Rule findings <span className="count">{s.ruleFindings.length}</span>
          </h2>
          <p className="muted">
            Possible issues to discuss, not confirmed billing errors.
          </p>
          {s.ruleFindings.map((f, i) => (
            <article className="finding" key={i}>
              <span className="badge warning">
                {f.kind === "possible_duplicate"
                  ? "Possible duplicate"
                  : "Review flag"}
              </span>
              <p>{f.message}</p>
              <div className="row-links">
                {f.rowIds.map((id) => (
                  <a href={`#${id}`} key={id}>
                    {bill.parsedData.find((r) => r.id === id)?.item || id}
                  </a>
                ))}
              </div>
              {f.pages?.length > 0 && (
                <small>Source: page {f.pages.join(", ")}</small>
              )}
            </article>
          ))}
          {!s.ruleFindings.length && (
            <p className="muted">
              {(bill.reviewedAt && bill.aiAnalysis?.ruleBasedFlags) || demo
                ? "No issues flagged by configured rules."
                : "Rules have not run on reviewed charges yet."}
            </p>
          )}
        </section>
        <section className="card">
          <p className="eyebrow">
            {demo ? "PREWRITTEN SAMPLE" : "AI-GENERATED"} · OPTIONAL GUIDANCE
          </p>
          <h2>A second perspective</h2>
          <p className="muted">
            Suggestions can be mistaken. Confirm details with your provider.
          </p>
          {bill.aiAnalysis?.summary && <p>{bill.aiAnalysis.summary}</p>}
          {s.suggestions.map((f, i) => (
            <article className="finding ai" key={i}>
              <p>{f.message}</p>
              <div className="row-links">
                {f.rowIds.map((id) => (
                  <a href={`#${id}`} key={id}>
                    {bill.parsedData.find((r) => r.id === id)?.item || id}
                  </a>
                ))}
              </div>
            </article>
          ))}
          {!s.complete && !demo && (
            <p className="muted">
              AI analysis is incomplete. Saved rule findings remain available.
            </p>
          )}
        </section>
      </div>
      <section className="card" id="questions">
        <p className="eyebrow">YOUR NEXT CONVERSATION</p>
        <h2>Questions to take to your provider</h2>
        <ol className="questions">
          {(bill.aiAnalysis?.questions?.length
            ? bill.aiAnalysis.questions
            : [
                "Can you provide a detailed breakdown of these charges?",
                "Does the printed total include all discounts, taxes and credits?",
              ]
          ).map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
        <p className="caption">
          Review support only. This report does not establish errors or
          guarantee savings.
        </p>
      </section>
      <section className="card" id="source">
        <h2>Source & extraction notes</h2>
        <p className="muted">
          Original files are temporary. Saved extracted text is shown below for
          traceability.
        </p>
        {bill.pages?.map((p) => (
          <details id={`source-${p.page}`} key={p.page}>
            <summary>
              Page {p.page} · {p.method === "text" ? "Embedded text" : "OCR"}
            </summary>
            {p.warning && <Alert type="warning">{p.warning}</Alert>}
            <pre>{p.text}</pre>
          </details>
        ))}
        {!bill.pages?.length && bill.extractedText && (
          <pre>{bill.extractedText}</pre>
        )}
        {bill.extraction?.ambiguous?.length > 0 && (
          <details>
            <summary>
              {bill.extraction.ambiguous.length} lines need manual checking
            </summary>
            {bill.extraction.ambiguous.map((a, i) => (
              <p key={i}>
                Page {a.page}: {a.sourceText}
                <small>{a.reason}</small>
              </p>
            ))}
          </details>
        )}
      </section>
      {demo ? (
        <section className="demo-cta">
          <div>
            <h2>Your own bill, a little clearer.</h2>
            <p>Create an account to upload, review and save your analysis.</p>
          </div>
          <Link className="btn primary" to="/register">
            Get started →
          </Link>
        </section>
      ) : (
        <div className="delete-area">
          {confirmDelete ? (
            <Alert type="warning">
              Delete this bill, saved text and analysis permanently?
              <div className="actions">
                <button className="btn danger" disabled={busy} onClick={remove}>
                  Yes, delete bill
                </button>
                <button
                  className="btn secondary"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </button>
              </div>
            </Alert>
          ) : (
            <button
              className="quiet danger-text"
              onClick={() => setConfirmDelete(true)}
            >
              Delete this bill
            </button>
          )}
        </div>
      )}
    </>
  );
}
