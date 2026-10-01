// Gemini wrapper (plain REST, no SDK) with retries + automatic fallback model.
// Everything is configured through environment variables:
//   GEMINI_API_KEY         (required)
//   GEMINI_MODEL           (default: gemini-3.5-flash)
//   GEMINI_FALLBACK_MODEL  (default: gemini-3.1-flash-lite)
//   GEMINI_API_BASE        (optional, default Google's public endpoint)

const DEFAULT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function getModels() {
  const primary = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const fallback = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.1-flash-lite";
  return [...new Set([primary, fallback].filter(Boolean))];
}

async function callGemini(model, prompt, { json = true, maxOutputTokens = 16384 } = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Add it to .env.local (or Vercel env vars).");
  }
  const base = process.env.GEMINI_API_BASE || DEFAULT_BASE;
  const res = await fetch(`${base}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: json ? "application/json" : "text/plain",
        maxOutputTokens,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`Gemini (${model}) HTTP ${res.status}: ${body.slice(0, 300)}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  const data = await res.json();
  const cand = data?.candidates?.[0];
  const text = (cand?.content?.parts || [])
    .filter((p) => p && p.text && !p.thought)
    .map((p) => p.text)
    .join("");

  if (!text) {
    const reason = cand?.finishReason || data?.promptFeedback?.blockReason || "unknown";
    throw new Error(`Gemini returned no text (reason: ${reason})`);
  }
  return text;
}

// Tolerant JSON parser: handles ```json fences and leading/trailing chatter.
export function parseJSON(text) {
  let t = String(text).trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(t);
  } catch {
    const firstObj = t.indexOf("{");
    const firstArr = t.indexOf("[");
    const start =
      firstObj === -1 ? firstArr : firstArr === -1 ? firstObj : Math.min(firstObj, firstArr);
    const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
    if (start === -1 || end <= start) throw new Error("AI response was not valid JSON");
    return JSON.parse(t.slice(start, end + 1));
  }
}

/**
 * Ask Gemini for JSON. `validate(obj)` must return the normalized object or throw.
 * Retries on rate limits / 5xx / bad JSON, then falls back to the second model.
 */
export async function generateJSON(prompt, { validate, attemptsPerModel = 3 } = {}) {
  const models = getModels();
  let lastErr;

  for (const model of models) {
    for (let attempt = 1; attempt <= attemptsPerModel; attempt++) {
      try {
        const text = await callGemini(model, prompt, { json: true });
        const obj = parseJSON(text);
        return validate ? validate(obj) : obj;
      } catch (err) {
        lastErr = err;
        const status = err.status;

        // Bad / missing key -> no point retrying anything.
        if (status === 400 && /API key|API_KEY/i.test(err.body || "")) {
          throw new Error("Invalid GEMINI_API_KEY. Please check your key in the env file.");
        }
        if (status === 401 || status === 403) {
          throw new Error(`Gemini rejected the request (${status}). Check GEMINI_API_KEY / API access.`);
        }
        // Model doesn't exist (retired) -> jump to the fallback model.
        if (status === 404) break;

        // Rate limit / overloaded / malformed JSON -> back off and retry.
        if (attempt < attemptsPerModel) {
          await sleep(1500 * attempt * (status === 429 ? 3 : 1));
        }
      }
    }
  }
  throw new Error(`AI generation failed: ${lastErr?.message || "unknown error"}`);
}
