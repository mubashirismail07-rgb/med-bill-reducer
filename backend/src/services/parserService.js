const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
function parseBillText(rawText) {
  const lineItems = [],
    adjustments = [],
    ambiguous = [],
    printedTotals = [];
  let printedTotal = null,
    page = 1;
  const currencies = [
    ...new Set(
      (rawText.match(/\b(?:USD|INR|AED|EUR|GBP|CAD|AUD)\b/g) || []).concat(
        rawText.includes("₹") ? ["INR"] : [],
        rawText.includes("€") ? ["EUR"] : [],
        rawText.includes("£") ? ["GBP"] : [],
      ),
    ),
  ];
  const currency = currencies.length === 1 ? currencies[0] : null;
  for (const sourceText of rawText.split("\n")) {
    const line = sourceText.trim();
    if (!line) continue;
    const marker = line.match(/^--- Page (\d+) ---$/);
    if (marker) {
      page = +marker[1];
      continue;
    }
    if (
      /^(date|invoice|patient|account|address|phone|page|bill no|admission|discharge|name|thank|description)\b/i.test(
        line,
      ) ||
      /\b(street|road|drive|city|avenue|postal|zip)\b/i.test(line) ||
      /\b\d{1,4}[/-]\d{1,2}[/-]\d{2,4}\b/.test(line)
    )
      continue;
    const cleaned = line
      .replace(/\b(?:USD|INR|AED|EUR|GBP|CAD|AUD)\b/g, "")
      .replace(/[$₹€£]/g, "")
      .trim();
    const match = cleaned.match(
      /^(.*?)\s+(-?\d[\d,]*(?:\.\d{1,2})?)(?:\s+(-?\d[\d,]*(?:\.\d{1,2})?))?(?:\s+(-?\d[\d,]*(?:\.\d{1,2})?))?$/,
    );
    if (!match) {
      if (/\d/.test(line))
        ambiguous.push({
          sourceText,
          page,
          reason: "Could not confidently identify a charge.",
        });
      continue;
    }
    const item = match[1].trim();
    const nums = match
      .slice(2)
      .filter((x) => x !== undefined)
      .map((x) => Number(x.replace(/,/g, "")));
    const amount = nums.at(-1);
    if (
      /^(grand total|total(?: amount| due)?|amount due|balance due)\b/i.test(
        item,
      )
    ) {
      printedTotals.push({ amount, sourceText, page });
      continue;
    }
    if (
      /^(subtotal|sub total|balance forward|paid|payment|insurance)\b/i.test(
        item,
      )
    )
      continue;
    if (/^(discount|tax|vat|credit)\b/i.test(item)) {
      adjustments.push({
        item,
        amount: /discount|credit/i.test(item) ? -Math.abs(amount) : amount,
        sourceText,
        page,
      });
      continue;
    }
    if (
      !/[a-z]{2}/i.test(item) ||
      nums.length === 2 ||
      (nums.length === 1 && !/\.\d{2}\s*$/.test(cleaned))
    ) {
      ambiguous.push({
        sourceText,
        page,
        reason: "Ambiguous columns or amount; review manually.",
      });
      continue;
    }
    const quantity = nums.length === 3 ? nums[0] : null,
      unitPrice = nums.length === 3 ? nums[1] : null;
    const warning =
      quantity !== null && Math.abs(round(quantity * unitPrice) - amount) > 0.01
        ? "Quantity × unit price differs from line total."
        : null;
    lineItems.push({
      id: `row-${lineItems.length + 1}`,
      item,
      amount,
      quantity,
      unitPrice,
      sourceText,
      page,
      warning,
    });
  }
  const distinctTotals = [...new Set(printedTotals.map((t) => t.amount))];
  printedTotal = distinctTotals.length === 1 ? distinctTotals[0] : null;
  if (distinctTotals.length > 1)
    ambiguous.push(
      ...printedTotals.map((t) => ({
        ...t,
        reason:
          "Multiple different printed totals found. Confirm the bill total manually.",
      })),
    );
  const totalAmount = round(lineItems.reduce((s, r) => s + r.amount, 0));
  return {
    lineItems,
    totalAmount,
    itemCount: lineItems.length,
    currency,
    printedTotal,
    printedTotals,
    adjustments,
    ambiguous,
    currencyWarning: currency
      ? null
      : "Currency is unknown or conflicting. Confirm it before analysis.",
  };
}
module.exports = { parseBillText, round };
