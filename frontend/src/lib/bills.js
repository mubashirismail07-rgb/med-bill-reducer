export const currencies = ["USD", "INR", "AED", "EUR", "GBP", "CAD", "AUD"];
export const money = (amount, currency) =>
  amount == null
    ? "Not available"
    : currency
      ? new Intl.NumberFormat("en", {
          style: "currency",
          currency,
          currencyDisplay: "code",
        }).format(amount)
      : `${Number(amount).toFixed(2)} · currency unknown`;
export const date = (value) =>
  value
    ? new Date(value).toLocaleDateString("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
export const message = (err) =>
  err.response?.data?.message ||
  "Could not connect. The free server may be waking up; retry in a moment.";
export const sample = {
  _id: "sample",
  fileName: "Fictional clinic · sample bill.pdf",
  createdAt: "2026-01-15T12:00:00Z",
  currency: "USD",
  reviewedAt: "2026-01-15",
  processing: { stage: "complete" },
  pages: [
    {
      page: 1,
      method: "text",
      text: "FICTIONAL SAMPLE — NOT A REAL PATIENT\nCurrency USD\nConsultation 1 120.00 120.00\nBlood count 1 45.00 45.00\nBlood count 1 45.00 45.00\nImaging 1 180.00 180.00\nDiscount -20.00\nTotal 370.00",
    },
  ],
  extraction: {
    printedTotal: 370,
    adjustments: [{ item: "Discount", amount: -20 }],
    ambiguous: [],
  },
  parsedData: [
    {
      id: "row-1",
      item: "Consultation",
      quantity: 1,
      unitPrice: 120,
      amount: 120,
      page: 1,
    },
    {
      id: "row-2",
      item: "Blood count",
      quantity: 1,
      unitPrice: 45,
      amount: 45,
      page: 1,
    },
    {
      id: "row-3",
      item: "Blood count",
      quantity: 1,
      unitPrice: 45,
      amount: 45,
      page: 1,
    },
    {
      id: "row-4",
      item: "Imaging",
      quantity: 1,
      unitPrice: 180,
      amount: 180,
      page: 1,
    },
  ],
  aiAnalysis: {
    aiStatus: "complete",
    summary:
      "This fictional bill includes a consultation, two blood count charges and imaging. Check whether the repeated blood count was intentional.",
    questions: [
      "Were both blood count services performed on separate occasions?",
      "Can you explain the imaging charge and the applied discount?",
    ],
  },
  summary: {
    lineTotal: 390,
    adjustments: -20,
    expectedTotal: 370,
    printedTotal: 370,
    discrepancy: 0,
    complete: true,
    stage: "complete",
    affectedCharges: 3,
    needsReview: true,
    status: "Needs attention",
    ruleFindings: [
      {
        kind: "possible_duplicate",
        source: "rule",
        rowIds: ["row-2", "row-3"],
        pages: [1],
        message:
          "Blood count appears twice at USD 45.00. Ask whether these represent separate services.",
      },
    ],
    suggestions: [
      {
        source: "ai",
        rowIds: ["row-4"],
        message:
          "Ask the provider for an itemized explanation of the imaging service. This is a prewritten sample suggestion.",
      },
    ],
  },
};
