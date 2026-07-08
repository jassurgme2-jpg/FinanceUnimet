import { DEFAULT_GEMINI_PROXY_URL } from "./config";

export const hasGeminiProxy = Boolean(DEFAULT_GEMINI_PROXY_URL);

export const askGeminiAnalyst = async ({ question, context }) => {
  if (!DEFAULT_GEMINI_PROXY_URL) {
    throw new Error("Gemini proxy URL is not configured.");
  }

  const response = await fetch(DEFAULT_GEMINI_PROXY_URL, {
    method: "POST",
    body: JSON.stringify({ question, context })
  });

  if (!response.ok) {
    throw new Error(`Gemini proxy returned ${response.status}`);
  }

  const data = await response.json();
  const text = data.text || data.answer || data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!text) {
    throw new Error("Gemini returned an empty answer.");
  }
  return text;
};
