import { io } from "socket.io-client";

// Determine Socket URL dynamically:
// 1. If VITE_SOCKET_URL environment variable is set, use it.
// 2. If running on deployed hostname (not localhost), fallback to production Render backend URL.
// 3. Otherwise fallback to local dev server (http://localhost:4000).
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const PROD_SOCKET_URL = "https://cloudlog-multi-tenant-saas-log-aggregator.onrender.com";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (isLocalhost ? "http://localhost:4000" : PROD_SOCKET_URL);

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

export default socket;
