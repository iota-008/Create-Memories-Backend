// Centralized backend configuration
export const IS_PROD = process.env.NODE_ENV === "production";

export const FRONTEND_URL = (process.env.FRONTEND_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

export const SECRET_KEY = process.env.SECRET_KEY || "change-me-in-env";

export const GOOGLE = {
  CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || "",
};

export const CORS_ORIGINS = (process.env.CORS_ORIGINS || "http://127.0.0.1:3000,http://localhost:3000,https://create-your-memory.netlify.app")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
