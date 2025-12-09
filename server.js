import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import fetch from "node-fetch"; // Assuming you need this if using an older Node version on Vercel

// --- 1. Database Setup ---
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI environment variable not set.");
  // In a real serverless deployment, this might be handled differently,
  // but we'll proceed assuming it will be set in Vercel.
}

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB connected successfully."))
  .catch(err => console.error("MongoDB connection error:", err));

// Define the Feedback Schema and Model
const feedbackSchema = new mongoose.Schema({
  rating: { type: Number, required: true },
  review: { type: String, required: true },
  aiResponse: { type: String, required: true },
  recommendedAction: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const Feedback = mongoose.model("Feedback", feedbackSchema);
// -------------------------

const app = express();
app.use(express.json());
app.use(cors());

// Secure API Key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// POST route
app.post("/api/feedback", async (req, res) => {
  const { rating, review } = req.body;

  // Ensure API Key is available
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "Gemini API Key not configured." });
  }

  // ... (Your AI Prompt logic remains the same) ...

  const responsePrompt = `
You are a customer service assistant.
A user gave a ${rating}-star rating and wrote: "${review}".
Write a short, empathetic response:
- If rating is low (1-2): apologize and show concern.
- If rating is medium (3): acknowledge and ask for suggestions.
- If rating is high (4-5): thank them warmly and encourage loyalty.
Keep it under 2 sentences.
`;

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
    // AI Response (Using the fetch API)
    const response1 = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      // ... (Rest of fetch call remains the same) ...
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
      // ... (Rest of fetch call remains the same) ...
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

  // --- Database Save (REPLACED FS) ---
  try {
    const newFeedback = new Feedback({
      rating,
      review,
      aiResponse,
      recommendedAction,
      // timestamp is auto-generated
    });
    await newFeedback.save();
    res.json({ success: true, aiResponse, recommendedAction });
  } catch (dbErr) {
    console.error("Database save error:", dbErr);
    res.status(500).json({ success: false, error: "Failed to save feedback." });
  }
  // ------------------------------------
});

// GET route
app.get("/api/feedbacks", async (req, res) => {
  // --- Database Fetch (REPLACED FS) ---
  try {
    const feedbacks = await Feedback.find().sort({ timestamp: -1 }); // Get latest first
    res.json(feedbacks);
  } catch (err) {
    console.error("Database fetch error:", err);
    res.status(500).json({ error: "Failed to retrieve feedbacks." });
  }
  // ------------------------------------
});

// --- 2. Serverless Export ---
// Export the app instance instead of calling app.listen()
export default app;

// IMPORTANT: Do not include the original app.listen() block:
// const PORT = 5000;
// app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));




