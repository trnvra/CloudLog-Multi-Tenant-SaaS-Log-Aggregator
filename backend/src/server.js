require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { Server: SocketIO } = require("socket.io");

const { connectMongo, createRedisClient } = require("./config/db");
const { setIO } = require("./config/socketManager");

/* ──────────────────────────── App Init ─────────────────────────── */

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

/* ──────────────────────────── Middleware ───────────────────────── */

// Security headers
app.use(helmet());

// CORS — allow the configured origin (defaults to all in dev)
app.use(
  cors({
    origin: CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "x-tenant-id"],
  })
);

// Body parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging — compact in prod, coloured in dev
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

/* ──────────────────────────── Health & Metrics ───────────────────── */

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

/**
 * GET /metrics
 * Exposes Prometheus scraping endpoint in standard text format.
 */
const { register } = require("./config/metrics");

app.get("/metrics", async (_req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

/* ──────────────────────────── Routes ──────────────────────────── */

app.use("/api/v1/auth", require("./routes/authRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/user", require("./routes/authRoutes"));
app.use("/api/v1/logs", require("./routes/logRoutes"));
app.use("/api/logs", require("./routes/logRoutes"));
app.use("/api/v1/alerts", require("./routes/alertRoutes"));
app.use("/api/alerts", require("./routes/alertRoutes"));

/* ──────────────────────────── 404 Handler ──────────────────────── */

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

/* ──────────────────────────── Error Handler ────────────────────── */

// Express requires all 4 params to recognise this as an error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[Error]", err.stack || err.message);

  // Mongoose validation errors → 400
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: "Validation failed", details: messages });
  }

  // Mongoose duplicate key → 409
  if (err.code === 11000) {
    return res.status(409).json({ error: "Duplicate entry", details: err.keyValue });
  }

  // Fallback
  const status = err.statusCode || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

/* ──────────────────────────── Bootstrap ────────────────────────── */

const bootstrap = async () => {
  // 1. MongoDB
  await connectMongo();

  // 2. Redis (optional — app still runs if Redis is down)
  const redis = createRedisClient();
  try {
    await redis.connect();
  } catch {
    console.warn("[Bootstrap] Redis unavailable — continuing without cache");
  }

  // Attach redis to app.locals so controllers/services can access it
  app.locals.redis = redis;

  // 3. HTTP server + Socket.io
  const httpServer = http.createServer(app);

  const io = new SocketIO(httpServer, {
    cors: {
      origin: CORS_ORIGIN,
      methods: ["GET", "POST"],
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Register the io instance so workers can import it without circular deps
  setIO(io);
  app.locals.io = io;

  // Socket.io connection lifecycle
  io.on("connection", (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Clients can join a room scoped to a specific service for filtered streams
    socket.on("subscribe", (serviceName) => {
      if (typeof serviceName === "string" && serviceName.length <= 128) {
        socket.join(`service:${serviceName}`);
        console.log(`[Socket.io] ${socket.id} subscribed to service:${serviceName}`);
      }
    });

    socket.on("unsubscribe", (serviceName) => {
      if (typeof serviceName === "string") {
        socket.leave(`service:${serviceName}`);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket.io] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  // 4. Start the BullMQ log ingestion worker
  const { startLogWorker } = require("./workers/logWorker");
  startLogWorker();

  // 5. Start listening
  httpServer.listen(PORT, () => {
    console.log(`\n🚀  Server running → http://localhost:${PORT}`);
    console.log(`    Environment   → ${process.env.NODE_ENV || "development"}`);
    console.log(`    Socket.io     → ready\n`);
  });
};

bootstrap().catch((err) => {
  console.error("[Fatal] Failed to start server:", err);
  process.exit(1);
});

module.exports = app; // exported for testing
