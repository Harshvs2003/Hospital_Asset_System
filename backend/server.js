import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import assetRoutes from "./routes/assetRoutes.js";

dotenv.config();
connectDB();

const app = express();
app.use(express.json());

const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Hello from server. Automatic restart enabled for server.");
});

// Mount asset routes
app.use("/api/assets", assetRoutes);

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
