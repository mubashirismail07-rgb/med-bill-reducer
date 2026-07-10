const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const analyzeBill = async (parsedData, extractedText) => {
  const billSummaryText = parsedData
    .map((item) => `- ${item.item}: $${item.amount}`)
    .join("\n");

  const totalAmount = parsedData.reduce((sum, item) => sum + item.amount, 0);

  const prompt = `
You are a medical billing expert helping patients understand their hospital bills.

Here is the patient's bill with ${parsedData.length} line items totaling $${totalAmount.toFixed(2)}:

${billSummaryText}

Analyze this bill and respond ONLY with a valid JSON object in exactly this format, no extra text, no markdown:

{
  "summary": "A 2-3 sentence plain-language overview of what this bill contains",
  "chargeExplanations": [
    {
      "item": "exact item name from bill",
      "amount": amount as number,
      "explanation": "plain-language explanation of what this charge is"
    }
  ],
  "duplicateCharges": [
    {
      "item": "item name",
      "occurrences": number of times it appears,
      "totalCharged": total amount charged for this item,
      "concern": "brief explanation of why this is flagged"
    }
  ],
  "suspiciousCharges": [
    {
      "item": "item name",
      "amount": amount as number,
      "reason": "why this charge seems unusual or suspicious"
    }
  ],
  "costSavingSuggestions": [
    "suggestion 1",
    "suggestion 2"
  ],
  "questionsToAsk": [
    "Question 1 to ask the hospital or insurance provider?",
    "Question 2?"
  ]
}

Rules:
- duplicateCharges should only be included if there are actual duplicates in the bill
- suspiciousCharges should only be flagged if genuinely unusual
- questionsToAsk should be specific to this bill, not generic
- All amounts must be numbers, not strings
- Return ONLY the JSON object, nothing else
`;

  const response = await client.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 2000,
  });

  const rawContent = response.choices[0].message.content.trim();

  // Strip markdown code fences if present
  const cleaned = rawContent.replace(/```json|```/g, "").trim();

  let analysis;
  try {
    analysis = JSON.parse(cleaned);
  } catch (err) {
    throw new Error("AI returned invalid JSON: " + rawContent);
  }

  return analysis;
};

module.exports = { analyzeBill };