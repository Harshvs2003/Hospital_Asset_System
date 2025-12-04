import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import assetRoutes from "./routes/assetRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import complaintRoutes from "./routes/complaintRoutes.js";

dotenv.config();
const app = express();
connectDB();

app.use(express.json());
app.use(cookieParser());
import cors from "cors";
// Allow common dev origins (Vite default 5173 and CRA default 3000).
const DEFAULT_ORIGINS = ["http://localhost:5000", "http://localhost:5173"];
const FRONTEND = process.env.FRONTEND_ORIGIN;
const allowedOrigins = FRONTEND
  ? [FRONTEND, ...DEFAULT_ORIGINS]
  : DEFAULT_ORIGINS;

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin like mobile apps or curl
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
      return callback(new Error("CORS policy: origin not allowed"), false);
    },
    credentials: true,
  })
);

// Mount asset routes
app.use("/api/auth", authRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/complaints", complaintRoutes);

app.get("/", (req, res) => {
  res.send("Hello from server. Automatic restart enabled for server.");
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
