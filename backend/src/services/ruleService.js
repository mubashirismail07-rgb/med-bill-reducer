function runRuleBasedChecks(items, currency) {
  const findings = [],
    groups = new Map();
  for (const row of items) {
    const key =
      row.item.toLowerCase().replace(/[^a-z0-9]/g, "") + ":" + row.amount;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  for (const rows of groups.values())
    if (rows.length > 1)
      findings.push({
        kind: "possible_duplicate",
        source: "rule",
        rowIds: rows.map((r) => r.id),
        pages: [...new Set(rows.map((r) => r.page).filter(Boolean))],
        message: `“${rows[0].item}” has ${rows.length} matching charges. Ask whether these represent separate services.`,
      });
  let thresholds = {};
  try {
    thresholds = JSON.parse(process.env.HIGH_PRICE_THRESHOLDS || "{}");
  } catch {
    /* Disabled when configuration is invalid. */
  }
  const threshold = thresholds[currency];
  for (const row of items) {
    if (Number.isFinite(threshold) && threshold > 0 && row.amount > threshold)
      findings.push({
        kind: "configured_threshold",
        source: "rule",
        rowIds: [row.id],
        pages: row.page ? [row.page] : [],
        message: `Above the configured ${currency} ${threshold} review threshold. This is a personal review setting, not a market benchmark.`,
      });
    if (row.warning)
      findings.push({
        kind: "extraction",
        source: "rule",
        rowIds: [row.id],
        pages: row.page ? [row.page] : [],
        message: row.warning,
      });
  }
  return {
    findings,
    totalFlagsFound: findings.length,
    affectedCharges: new Set(findings.flatMap((f) => f.rowIds)).size,
    hasIssues: findings.length > 0,
  };
}
module.exports = { runRuleBasedChecks };
