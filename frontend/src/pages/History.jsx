import { useEffect, useState } from "react";
import api from "../services/api";
import { Heading, Alert, Empty, BillsTable } from "../components/UI";
import { message } from "../lib/bills";
export default function History() {
  const [bills, setBills] = useState(null),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [sort, setSort] = useState("newest");
  useEffect(() => {
    api
      .get("/bills")
      .then((r) => setBills(r.data))
      .catch((e) => setError(message(e)));
  }, []);
  const shown = (bills || [])
    .filter(
      (b) =>
        b.fileName.toLowerCase().includes(search.toLowerCase()) &&
        (filter === "all" ||
          (filter === "complete" ? b.summary.complete : b.summary.needsReview)),
    )
    .sort(
      (a, b) =>
        (sort === "newest" ? -1 : 1) *
        (new Date(a.createdAt) - new Date(b.createdAt)),
    );
  return (
    <>
      <Heading title="Bill history">
        Your documents, reviewed charges and saved analyses.
      </Heading>
      {error && (
        <Alert>
          {error}
          <button onClick={() => window.location.reload()}>Retry</button>
        </Alert>
      )}
      <section className="card">
        <div className="filters">
          <label>
            Search bills
            <input
              type="search"
              placeholder="Search by filename"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label>
            Status
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All bills</option>
              <option value="review">Needs review</option>
              <option value="complete">Analysis complete</option>
            </select>
          </label>
          <label>
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>
        {!bills && !error ? (
          <p role="status">Loading bill history…</p>
        ) : shown.length ? (
          <BillsTable bills={shown} />
        ) : (
          <Empty
            title={
              search || filter !== "all"
                ? "No matching bills"
                : "Your history starts here"
            }
          />
        )}
      </section>
    </>
  );
}
