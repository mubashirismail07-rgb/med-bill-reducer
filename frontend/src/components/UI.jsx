import { Link } from "react-router-dom";
import { money, date } from "../lib/bills";
export function Icon({ name = "file" }) {
  const paths = {
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    upload: "M12 16V3m-5 5 5-5 5 5 M3 15v6h18v-6",
    history: "M3 12a9 9 0 1 0 3-7 M3 3v5h5 M12 7v5l3 2",
    file: "M6 3h8l4 4v14H6z M14 3v5h5 M9 12h6 M9 16h6",
    arrow: "M5 12h14 M14 7l5 5-5 5",
    check: "m5 12 4 4L19 6",
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.file} />
    </svg>
  );
}
export function Alert({ children, type = "error" }) {
  return (
    <div
      className={`alert ${type}`}
      role={type === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function Badge({ bill }) {
  return (
    <span
      className={`badge ${bill.summary?.needsReview ? "warning" : "neutral"}`}
    >
      {bill.summary?.status || "Review required"}
    </span>
  );
}
export function Heading({ eyebrow, title, children, action }) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow || "YOUR BILL WORKSPACE"}</p>
        <h1>{title}</h1>
        {children && <p className="muted">{children}</p>}
      </div>
      {action}
    </header>
  );
}
export function Empty({ title = "No bills yet", children }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon />
      </span>
      <h2>{title}</h2>
      <p className="muted">
        {children ||
          "Upload your first bill to turn charges into clear, reviewable information."}
      </p>
      <Link className="btn primary" to="/upload">
        Upload a bill <Icon name="arrow" />
      </Link>
    </div>
  );
}
export function BillsTable({ bills }) {
  return (
    <>
      <div className="bill-cards">
        {bills.map((b) => (
          <article key={b._id} className="bill-mobile">
            <strong>{b.fileName}</strong>
            <small>{date(b.createdAt)}</small>
            <div className="mobile-bill-meta">
              <span>
                {money(
                  b.summary?.printedTotal ?? b.summary?.expectedTotal,
                  b.currency,
                )}
              </span>
              <Badge bill={b} />
            </div>
            <p>{b.summary?.affectedCharges || 0} charges flagged</p>
            <Link className="text-link" to={`/bills/${b._id}`}>
              View analysis →
            </Link>
          </article>
        ))}
      </div>
      <div className="table-scroll bills-table">
        <table>
          <thead>
            <tr>
              <th>Bill / document</th>
              <th>Total billed</th>
              <th>Status</th>
              <th>Flagged charges</th>
              <th>
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {bills.map((b) => (
              <tr key={b._id}>
                <td>
                  <strong>{b.fileName}</strong>
                  <small>{date(b.createdAt)}</small>
                </td>
                <td>
                  {money(
                    b.summary?.printedTotal ?? b.summary?.expectedTotal,
                    b.currency,
                  )}
                </td>
                <td>
                  <Badge bill={b} />
                </td>
                <td>{b.summary?.affectedCharges || 0}</td>
                <td>
                  <Link className="text-link" to={`/bills/${b._id}`}>
                    View analysis <span aria-hidden="true">↗</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
