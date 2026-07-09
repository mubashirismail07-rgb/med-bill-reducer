
const cleanLine = (line) => line.trim().replace(/\s+/g, " ");


const hasAmount = (line) => /\$?[\d,]+(\.\d{1,2})?/.test(line);


const extractAmount = (line) => {
  const match = line.match(/\$?([\d,]+(\.\d{1,2})?)/);
  if (!match) return null;
  return parseFloat(match[1].replace(/,/g, ""));
};


const extractItem = (line) => {
  return line
    .replace(/\$?[\d,]+(\.\d{1,2})?/g, "")
    .replace(/[-:]/g, "")
    .trim();
};

const isNoiseLine = (line) => {
  const noise = [
    /^total/i,
    /^subtotal/i,
    /^grand total/i,
    /^balance/i,
    /^amount due/i,
    /^date/i,
    /^invoice/i,
    /^patient name/i,
    /^account/i,
    /^page/i,
    /^thank you/i,
    /^please pay/i,
    /^description/i,
    /^charges/i,
    /^hospital/i,
    /^clinic/i,
    /^address/i,
    /^phone/i,
    /^tax/i,
  ];
  return noise.some((pattern) => pattern.test(line.trim()));
};

const parseBillText = (rawText) => {
  if (!rawText || rawText.trim().length === 0) {
    throw new Error("No text to parse");
  }

  const lines = rawText.split("\n").map(cleanLine).filter(Boolean);

  const lineItems = [];

  for (const line of lines) {

    if (isNoiseLine(line)) continue;


    if (line.length < 3) continue;


    if (!hasAmount(line)) continue;

    const amount = extractAmount(line);
    const item = extractItem(line);


    if (!item || item.length < 2) continue;
    if (!amount || amount <= 0) continue;

    lineItems.push({ item, amount });
  }

  const totalAmount = lineItems.reduce((sum, i) => sum + i.amount, 0);

  return {
    lineItems,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    itemCount: lineItems.length,
  };
};

module.exports = { parseBillText };