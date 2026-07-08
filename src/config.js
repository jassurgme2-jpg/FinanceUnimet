export const DEFAULT_GOOGLE_SHEET_ID =
  import.meta.env.VITE_GOOGLE_SHEET_ID || "1WHAVOJSBm5IkA6W0NMLtR9TthdrDcT0cQLXZDR90Gsw";

export const DEFAULT_GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";
export const DEFAULT_APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || "";
export const DEFAULT_APPS_SCRIPT_TOKEN = import.meta.env.VITE_APPS_SCRIPT_TOKEN || "my_secret_token_123";
export const DEFAULT_GEMINI_PROXY_URL = import.meta.env.VITE_GEMINI_PROXY_URL || "";
export const DEFAULT_EXCHANGE_RATE = import.meta.env.VITE_EXCHANGE_RATE || "12800";
export const DEFAULT_AUTO_CONVERT = import.meta.env.VITE_AUTO_CONVERT !== "false";

export const HAS_HOSTED_GOOGLE_CONFIG = Boolean(DEFAULT_GOOGLE_SHEET_ID && DEFAULT_GOOGLE_API_KEY);
