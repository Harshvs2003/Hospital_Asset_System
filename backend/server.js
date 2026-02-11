// server.js
import "./sentry.js";
import express from "express";
import * as Sentry from "@sentry/node";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import assetRoutes from "./routes/assetRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import complaintRoutes from "./routes/complaintRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import reminderRoutes from "./routes/reminderRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();

// Trust proxy so secure cookies and req.protocol work behind Render/Heroku/Vercel
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

connectDB();

// Basic security headers
app.use(helmet());

// limit body size to avoid large payload DoS
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// simple rate limiter for all requests (tweak limits as needed)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 200, // limit each IP to 200 requests per windowMs
});
app.use(limiter);

// CORS config
const DEFAULT_ORIGINS = ["https://hospital-asset-system.vercel.app", "http://localhost:5173", "https://app.assetops.in"];
const FRONTEND = process.env.FRONTEND_ORIGIN;
const extraOrigins = FRONTEND
  ? FRONTEND.split(",").map((o) => o.trim()).filter(Boolean)
  : [];
const allowedOrigins = [...extraOrigins, ...DEFAULT_ORIGINS];
const allowedOriginRegexes = [
  // Vercel preview deployments for this project/team
  /^https:\/\/hospital-asset-system-[a-z0-9-]+-harshvardhan-sinhas-projects\.vercel\.app$/i,
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (curl, mobile apps, Postman)
      if (!origin) return callback(null, true);
      const isAllowedByList = allowedOrigins.includes(origin);
      const isAllowedByPattern = allowedOriginRegexes.some((pattern) => pattern.test(origin));
      if (isAllowedByList || isAllowedByPattern) return callback(null, true);
      console.warn(`Blocked CORS origin: ${origin}`);
      return callback(new Error("CORS policy: origin not allowed"), false);
    },
    credentials: true,
    optionsSuccessStatus: 200,
    exposedHeaders: ["Set-Cookie"],
  })
);

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/notifications", notificationRoutes);

// health endpoint for platform checks
app.get("/_health", (_req, res) => res.status(200).json({ status: "ok", uptime: process.uptime() }));

// root
app.get("/", (req, res) => {
  res.send("Hello from server. Automatic restart enabled for server.");
});

// Sentry error handler must be before the app's error handler
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// global error handler (JSON response)
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err && err.stack ? err.stack : err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal Server Error" });
});

const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`🚀 Server running on port ${port} - NODE_ENV=${process.env.NODE_ENV}`);
});

// graceful shutdown (nice-to-have on platforms)
const shutdown = async () => {
  console.log("Shutting down gracefully...");
  server.close(() => {
    console.log("HTTP server closed.");
    // if your connectDB exported a close method, call it here
    process.exit(0);
  });
  // force exit after 10s
  setTimeout(() => process.exit(1), 10000);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
