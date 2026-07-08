# Gemini AI setup

The public GitHub Pages frontend must not contain the Gemini API key. Use a small proxy and expose only the proxy URL to the app.

## 1. Create the proxy

1. Open Google Apps Script.
2. Create a new project.
3. Copy `scripts/gemini-proxy-apps-script.js` into `Code.gs`.
4. Open Project Settings -> Script Properties.
5. Add:

```text
GEMINI_API_KEY=your_real_gemini_key
```

6. Deploy -> New deployment -> Web app.
7. Execute as: Me.
8. Who has access: Anyone.
9. Copy the `/exec` Web App URL.

## 2. Connect GitHub Pages

In GitHub repo `jassurgme2-jpg/FinanceUnimet`:

1. Settings -> Secrets and variables -> Actions -> Variables.
2. Add repository variable:

```text
VITE_GEMINI_PROXY_URL=https://script.google.com/macros/s/.../exec
```

3. Push to `main` or rerun the Pages workflow.

## 3. Local development

Add this to `.env.local`:

```text
VITE_GEMINI_PROXY_URL=https://script.google.com/macros/s/.../exec
```

Do not add `GEMINI_API_KEY` to `.env.local` for the Vite frontend.
