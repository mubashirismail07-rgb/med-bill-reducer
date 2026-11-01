import { useState } from "react";
import { currencies } from "../lib/bills";
export default function ChargeReview({ bill, onSave, busy }) {
  const [rows, setRows] = useState(
      bill.parsedData.map((r, i) => ({ ...r, id: r.id || `row-${i + 1}` })),
    ),
    [currency, setCurrency] = useState(bill.currency || ""),
    [printed, setPrinted] = useState(bill.extraction?.printedTotal ?? ""),
    [adjustments, setAdjustments] = useState(
      bill.extraction?.adjustments || [],
    );
  const edit = (index, key, value) =>
    setRows(rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          rows: rows.map((r) => ({
            ...r,
            amount: Number(r.amount),
            quantity: r.quantity === "" ? null : r.quantity,
            unitPrice: r.unitPrice === "" ? null : r.unitPrice,
          })),
          currency,
          printedTotal: printed === "" ? null : Number(printed),
          adjustments: adjustments.map((a) => ({
            ...a,
            amount: Number(a.amount),
          })),
        });
      }}
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">YOU HAVE THE FINAL SAY</p>
          <h2>Review extracted charges</h2>
        </div>
        <span className="badge warning">Review required</span>
      </div>
      <p className="muted">
        Compare these rows with your bill. OCR and parsing can make mistakes;
        missing charges can be added below. Saving edits clears the previous
        analysis.
      </p>
      <div className="filters">
        <label>
          Bill currency
          <select
            required
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="">Confirm currency</option>
            {currencies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Printed bill total
          <input
            type="number"
            step="0.01"
            value={printed}
            onChange={(e) => setPrinted(e.target.value)}
            placeholder="Not shown"
          />
        </label>
      </div>
      <div className="table-scroll">
        <table className="review-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Line total</th>
              <th>Source</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td>
                  <input
                    aria-label={`Description ${i + 1}`}
                    required
                    maxLength={500}
                    value={r.item}
                    onChange={(e) => edit(i, "item", e.target.value)}
                  />
                  {r.warning && (
                    <small className="warning-text">{r.warning}</small>
                  )}
                </td>
                <td>
                  <input
                    aria-label={`Quantity ${i + 1}`}
                    type="number"
                    min="0.001"
                    step="any"
                    value={r.quantity ?? ""}
                    onChange={(e) =>
                      edit(
                        i,
                        "quantity",
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label={`Unit price ${i + 1}`}
                    type="number"
                    step=".01"
                    value={r.unitPrice ?? ""}
                    onChange={(e) =>
                      edit(
                        i,
                        "unitPrice",
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label={`Line total ${i + 1}`}
                    required
                    type="number"
                    step=".01"
                    value={r.amount}
                    onChange={(e) => edit(i, "amount", e.target.value)}
                  />
                </td>
                <td>{r.page ? `p. ${r.page}` : "Manual"}</td>
                <td>
                  <button
                    type="button"
                    className="quiet"
                    onClick={() => setRows(rows.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="btn secondary"
        onClick={() =>
          setRows([
            ...rows,
            {
              id: crypto.randomUUID(),
              item: "",
              amount: 0,
              quantity: null,
              unitPrice: null,
            },
          ])
        }
      >
        + Add charge
      </button>
      <h3 className="spaced">Taxes, discounts & credits</h3>
      <p className="caption">
        Separate from charge rows. Enter discounts and credits as negative
        amounts.
      </p>
      {adjustments.map((a, i) => (
        <div className="adjustment" key={i}>
          <input
            aria-label={`Adjustment description ${i + 1}`}
            required
            value={a.item}
            onChange={(e) =>
              setAdjustments(
                adjustments.map((r, j) =>
                  j === i ? { ...r, item: e.target.value } : r,
                ),
              )
            }
          />
          <input
            aria-label={`Adjustment amount ${i + 1}`}
            required
            type="number"
            step=".01"
            value={a.amount}
            onChange={(e) =>
              setAdjustments(
                adjustments.map((r, j) =>
                  j === i ? { ...r, amount: e.target.value } : r,
                ),
              )
            }
          />
          <button
            type="button"
            className="quiet"
            onClick={() =>
              setAdjustments(adjustments.filter((_, j) => j !== i))
            }
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="quiet"
        onClick={() =>
          setAdjustments([...adjustments, { item: "", amount: 0 }])
        }
      >
        + Add adjustment
      </button>
      <label className="check-label">
        <input type="checkbox" required />I compared the charges, adjustments
        and currency with the source bill.
      </label>
      <button className="btn primary" disabled={busy || !rows.length}>
        {busy ? "Saving…" : "Confirm charges & analyze"}
      </button>
    </form>
  );
}
