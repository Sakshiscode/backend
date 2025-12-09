import express from "express";
import fs from "fs";
import cors from "cors";
// In Node 24+, fetch is built-in. Remove node-fetch import if not needed.
// import fetch from "node-fetch";

const app = express();
app.use(express.json());
app.use(cors());

// POST route
app.post("/api/feedback", async (req, res) => {
  const { rating, review } = req.body;

  let data = fs.existsSync("./feedback.json")
    ? JSON.parse(fs.readFileSync("./feedback.json"))
    : [];

  const GEMINI_API_KEY = "AIzaSyDTdE2BzX9Npmhi0FcTPZNz1tSWot5DlsQ";

  // Prompt for AI Response
  const responsePrompt = `
You are a customer service assistant.
A user gave a ${rating}-star rating and wrote: "${review}".
Write a short, empathetic response:
- If rating is low (1-2): apologize and show concern.
- If rating is medium (3): acknowledge and ask for suggestions.
- If rating is high (4-5): thank them warmly and encourage loyalty.
Keep it under 2 sentences.
`;

  // Prompt for Recommended Action
  const actionPrompt = `
You are a customer service strategist.
A user gave a ${rating}-star rating and wrote: "${review}".
Suggest one specific recommended action the company should take next.
- If rating is low (1-2): propose a recovery step (apology, compensation, follow-up).
- If rating is medium (3): propose an improvement step (ask for suggestions, offer support).
- If rating is high (4-5): propose a positive step (thank them, encourage testimonials, loyalty rewards).
Keep the action concise (1 sentence).
`;

  let aiResponse = "Thank you for your feedback."; // fallback
  let recommendedAction = "Follow up with the customer."; // fallback

  try {
    // AI Response
    const response1 = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: responsePrompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 300 },
        }),
      }
    );
    const dataAI1 = await response1.json();
    if (dataAI1.candidates?.[0]?.content?.parts?.[0]?.text) {
      aiResponse = dataAI1.candidates[0].content.parts[0].text;
    }

    // Recommended Action
    const response2 = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: actionPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
        }),
      }
    );
    const dataAI2 = await response2.json();
    if (dataAI2.candidates?.[0]?.content?.parts?.[0]?.text) {
      recommendedAction = dataAI2.candidates[0].content.parts[0].text;
    }
  } catch (err) {
    console.error("AI generation error:", err);
  }

  const feedback = {
    rating,
    review,
    aiResponse,
    recommendedAction,
    timestamp: new Date().toISOString(),
  };

  data.push(feedback);
  fs.writeFileSync("./feedback.json", JSON.stringify(data, null, 2));

  res.json({ success: true, aiResponse, recommendedAction });
});

// GET route
app.get("/api/feedbacks", (req, res) => {
  if (fs.existsSync("./feedback.json")) {
    const data = JSON.parse(fs.readFileSync("./feedback.json"));
    res.json(data);
  } else {
    res.json([]);
  }
});

export default app;


