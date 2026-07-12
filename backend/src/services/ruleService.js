// Normalize a string for comparison
const normalize = (str) =>
  str.toLowerCase().replace(/[^a-z0-9]/g, "").trim();

// Known lab/diagnostic test keywords
const LAB_KEYWORDS = [
  "blood test", "urine test", "x-ray", "xray", "mri", "ct scan",
  "ultrasound", "ecg", "ekg", "culture", "biopsy", "pathology",
  "hemogram", "cbc", "lipid", "glucose", "creatinine", "thyroid",
];

// Thresholds for suspicious charges (in dollars)
const HIGH_COST_THRESHOLDS = {
  default: 5000,
  consultation: 500,
  medicine: 1000,
  lab: 2000,
  surgery: 20000,
};

// Check 1 — Exact duplicate charges
const findDuplicateCharges = (lineItems) => {
  const seen = {};
  const duplicates = [];

  for (const item of lineItems) {
    const key = normalize(item.item);
    if (!seen[key]) {
      seen[key] = { count: 0, amount: item.amount, original: item.item };
    }
    seen[key].count++;
  }

  for (const [key, data] of Object.entries(seen)) {
    if (data.count > 1) {
      duplicates.push({
        item: data.original,
        occurrences: data.count,
        totalCharged: parseFloat((data.amount * data.count).toFixed(2)),
        flag: "DUPLICATE_CHARGE",
        message: `"${data.original}" appears ${data.count} times on the bill.`,
      });
    }
  }

  return duplicates;
};

// Check 2 — Repeated lab tests
const findRepeatedLabTests = (lineItems) => {
  const repeated = [];

  const labItems = lineItems.filter((item) =>
    LAB_KEYWORDS.some((keyword) =>
      item.item.toLowerCase().includes(keyword)
    )
  );

  const seen = {};
  for (const item of labItems) {
    const key = normalize(item.item);
    if (!seen[key]) {
      seen[key] = { count: 0, original: item.item };
    }
    seen[key].count++;
  }

  for (const [key, data] of Object.entries(seen)) {
    if (data.count > 1) {
      repeated.push({
        item: data.original,
        occurrences: data.count,
        flag: "REPEATED_LAB_TEST",
        message: `Lab test "${data.original}" was performed ${data.count} times. Verify if this was medically necessary.`,
      });
    }
  }

  return repeated;
};

// Check 3 — Abnormally high charges
const findHighCostItems = (lineItems) => {
  const flagged = [];

  for (const item of lineItems) {
    let threshold = HIGH_COST_THRESHOLDS.default;

    const nameLower = item.item.toLowerCase();
    if (nameLower.includes("consultation") || nameLower.includes("visit")) {
      threshold = HIGH_COST_THRESHOLDS.consultation;
    } else if (nameLower.includes("medicine") || nameLower.includes("drug") || nameLower.includes("medication")) {
      threshold = HIGH_COST_THRESHOLDS.medicine;
    } else if (
      nameLower.includes("blood") || nameLower.includes("test") ||
      nameLower.includes("lab") || nameLower.includes("scan")
    ) {
      threshold = HIGH_COST_THRESHOLDS.lab;
    } else if (nameLower.includes("surgery") || nameLower.includes("operation")) {
      threshold = HIGH_COST_THRESHOLDS.surgery;
    }

    if (item.amount > threshold) {
      flagged.push({
        item: item.item,
        amount: item.amount,
        threshold,
        flag: "HIGH_COST",
        message: `"${item.item}" costs $${item.amount}, which exceeds the expected threshold of $${threshold} for this type of charge.`,
      });
    }
  }

  return flagged;
};

// Check 4 — Missing or incomplete descriptions
const findMissingDescriptions = (lineItems) => {
  const flagged = [];

  for (const item of lineItems) {
    if (!item.item || item.item.trim().length < 3) {
      flagged.push({
        item: item.item || "Unknown",
        amount: item.amount,
        flag: "MISSING_DESCRIPTION",
        message: `A charge of $${item.amount} has no description or an incomplete one. Request itemization from the provider.`,
      });
    }
  }

  return flagged;
};

// Main function — runs all checks
const runRuleBasedChecks = (lineItems) => {
  const items = Array.isArray(lineItems)
    ? lineItems.map((i) => (i.toObject ? i.toObject() : i))
    : Object.values(lineItems);

  const duplicateCharges = findDuplicateCharges(items);
  const repeatedLabTests = findRepeatedLabTests(items);
  const highCostItems = findHighCostItems(items);
  const missingDescriptions = findMissingDescriptions(items);

  const allFlags = [
    ...duplicateCharges,
    ...repeatedLabTests,
    ...highCostItems,
    ...missingDescriptions,
  ];

  return {
    totalFlagsFound: allFlags.length,
    duplicateCharges,
    repeatedLabTests,
    highCostItems,
    missingDescriptions,
    hasIssues: allFlags.length > 0,
  };
};

module.exports = { runRuleBasedChecks };