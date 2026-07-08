// Google Apps Script Web App proxy for FinanceFlow Gemini Analyst.
// Store the real key in Project Settings -> Script Properties:
// GEMINI_API_KEY = your Google Gemini API key

const GEMINI_MODEL = "gemini-2.5-flash";

// oxlint-disable-next-line no-unused-vars
function doPost(e) {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    if (!apiKey) {
      return jsonResponse({ error: "GEMINI_API_KEY is not configured in Script Properties." }, 500);
    }

    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const question = (body.question || "").toString().slice(0, 1000);
    const context = body.context || {};
    const prompt = buildPrompt(question, context);

    const response = UrlFetchApp.fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "post",
        contentType: "application/json",
        headers: {
          "x-goog-api-key": apiKey
        },
        muteHttpExceptions: true,
        payload: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 900
          }
        })
      }
    );

    const status = response.getResponseCode();
    const payload = JSON.parse(response.getContentText() || "{}");
    if (status < 200 || status >= 300) {
      return jsonResponse({ error: "Gemini API error", status, details: payload }, status);
    }

    const text = (((payload.candidates || [])[0] || {}).content || {}).parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    return jsonResponse({ text: text || "Gemini did not return text." });
  } catch (err) {
    return jsonResponse({ error: err.message || String(err) }, 500);
  }
}

// oxlint-disable-next-line no-unused-vars
function doGet() {
  return jsonResponse({ ok: true, service: "FinanceFlow Gemini proxy" });
}

function buildPrompt(question, context) {
  return [
    "Ты финансовый аналитик FinanceFlow.",
    "Отвечай на русском языке, коротко, деловым стилем.",
    "Используй только переданную финансовую сводку. Не выдумывай строки и цифры.",
    "Если данных недостаточно, прямо скажи, каких данных не хватает.",
    "Формат ответа: 3-6 коротких пунктов, затем один практический вывод.",
    "",
    `Вопрос пользователя: ${question || "Что важно по финансам?"}`,
    "",
    "Финансовая сводка JSON:",
    JSON.stringify(context, null, 2)
  ].join("\n");
}

function jsonResponse(data, status) {
  const output = ContentService
    .createTextOutput(JSON.stringify({ ...data, status: status || 200 }))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
