import { DEFAULT_GEMINI_PROXY_URL } from "./config";

export const hasGeminiProxy = Boolean(DEFAULT_GEMINI_PROXY_URL);

const getGeminiText = (data) => data.text
  || data.answer
  || data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("")
  || "";

const getGeminiError = (data) => {
  const detailsMessage = data.details?.error?.message || data.details?.message;
  const message = detailsMessage || data.error || "";

  if (/GEMINI_API_KEY is not configured/i.test(message)) {
    return "В Google Apps Script не найден GEMINI_API_KEY. В Script properties слева должно быть GEMINI_API_KEY, справа сам API ключ.";
  }

  if (message) {
    return message;
  }

  return "";
};

export const askGeminiAnalyst = async ({ question, context }) => {
  if (!DEFAULT_GEMINI_PROXY_URL) {
    throw new Error("Gemini proxy URL не настроен.");
  }

  const response = await fetch(DEFAULT_GEMINI_PROXY_URL, {
    method: "POST",
    body: JSON.stringify({ question, context })
  });

  if (!response.ok) {
    throw new Error(`Gemini proxy вернул HTTP ${response.status}.`);
  }

  const data = await response.json();
  const proxyError = getGeminiError(data);
  if (proxyError || Number(data.status || 200) >= 400) {
    throw new Error(proxyError || `Gemini proxy вернул статус ${data.status}.`);
  }

  const text = getGeminiText(data).trim();
  if (!text) {
    throw new Error("Gemini вернул пустой ответ.");
  }
  return text;
};
