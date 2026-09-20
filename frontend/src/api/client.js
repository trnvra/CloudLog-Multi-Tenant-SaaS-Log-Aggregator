import axios from "axios";

// Determine API Base URL dynamically:
// 1. If VITE_API_URL environment variable is set, use it.
// 2. If running on deployed hostname (not localhost), fallback to production Render backend URL.
// 3. Otherwise fallback to local dev server (http://localhost:4000).
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const PROD_API_URL = "https://cloudlog-multi-tenant-saas-log-aggregator.onrender.com";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (isLocalhost ? "http://localhost:4000" : PROD_API_URL);

const DEFAULT_API_KEY =
  import.meta.env.VITE_API_KEY || "log_secret_api_key_123";

const client = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Dynamic Interceptor to attach stored x-api-key and Bearer JWT token
client.interceptors.request.use(
  (config) => {
    const activeApiKey = localStorage.getItem("activeApiKey") || DEFAULT_API_KEY;
    const authToken = localStorage.getItem("authToken");

    config.headers["x-api-key"] = activeApiKey;
    if (authToken) {
      config.headers["Authorization"] = `Bearer ${authToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default client;
