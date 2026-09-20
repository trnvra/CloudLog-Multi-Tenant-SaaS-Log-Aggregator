import axios from "axios";

// Base API client configured with fallback to port 4000
const API_BASE = import.meta.env.VITE_API_URL || "https://cloudlog-multi-tenant-saas-log-aggregator.onrender.com";
const DEFAULT_API_KEY = import.meta.env.VITE_API_KEY;

const client = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
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
