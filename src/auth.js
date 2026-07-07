const AUTH_STORAGE_KEY = "finance_flow_auth";
const AUTH_HASH = "f568490768f606bdf5b013c22145631d55a90ab810e30cb0e21df1be6d4a4c94";

export const isAuthenticated = () => sessionStorage.getItem(AUTH_STORAGE_KEY) === "true";

export const markAuthenticated = () => {
  sessionStorage.setItem(AUTH_STORAGE_KEY, "true");
};

export const logout = () => {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
};

export const validateCredentials = async (login, password) => {
  const payload = new TextEncoder().encode(`${login.trim()}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  const hash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return hash === AUTH_HASH;
};
