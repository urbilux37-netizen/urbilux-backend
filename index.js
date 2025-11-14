// =======================
//  URBILUX Backend Server
// =======================
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const cookieParser = require("cookie-parser");
const pool = require("./db");
const { adminOnly } = require("./middleware/authMiddleware");
const axios = require("axios");

const app = express();

// ✅ Render proxy trust (important for secure cookies)
app.set("trust proxy", 1);

// ---------------- MIDDLEWARE ----------------
// ✅ CORS config (Render + Localhost + Cloudflare Pages)
app.use(
  cors({
    origin: [
      "https://urbiluxbd.com",
      "https://www.urbiluxbd.com",
      "https://urbilux.pages.dev",
      "http://localhost:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Must come before all routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---------------- UNIQUE IP VISIT TRACKING MIDDLEWARE ----------------
app.use(async (req, res, next) => {
  try {
    // API route হলে count করবে না (শুধু frontend page visits)
    if (!req.path.startsWith("/api")) {
      const rawIp =
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket.remoteAddress;

      const ip = rawIp?.replace("::ffff:", "") || "unknown";

      // আজ এই IP আগে count হয়েছে কিনা?
      const check = await pool.query(
        `SELECT id FROM visit_logs
         WHERE ip_address = $1
         AND visited_at::date = CURRENT_DATE
         LIMIT 1`,
        [ip]
      );

      if (check.rows.length === 0) {
        await pool.query(
          "INSERT INTO visit_logs (ip_address) VALUES ($1)",
          [ip]
        );
      }
    }
  } catch (err) {
    console.log("Visit Log Error:", err);
  }

  next();
});

// ---------------- REQUEST LOGGER ----------------
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ---------------- FILE UPLOAD FOLDERS ----------------
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

// ---------------- ROUTES IMPORT ----------------
const authRoutes = require("./routes/auth");
const cartRoutes = require("./routes/cart");
const checkoutRoutes = require("./routes/checkout");
const footerRoutes = require("./routes/footer");
const bannerRoutes = require("./routes/banners");
const categoryRoutes = require("./routes/categories");
const productRoutes = require("./routes/products");
const statsRoutes = require("./routes/stats");

// 🟣 Traffic Stats Route (ADD THIS)
const trafficStats = require("./routes/trafficStats");

// ---------------- ROUTES REGISTER ----------------
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/footer", footerRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/categories", categoryRoutes);
app.use("/products", productRoutes);
app.use("/api/stats", statsRoutes);

// 🟣 Register new Traffic Stats Route (ADD THIS)
app.use("/api/stats", trafficStats);

// ---------------- ADMIN PROTECTED TEST ROUTE ----------------
app.get("/api/admin/test", adminOnly, async (req, res) => {
  try {
    res.json({ success: true, message: "✅ You are an admin!", user: req.user });
  } catch (err) {
    console.error("Admin route error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- ROOT ROUTE ----------------
app.get("/", (req, res) => {
  res.send("✅ URBILUX backend is alive and running!");
});

// ---------------- HEALTH CHECK ----------------
app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ ok: true, db_time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ ok: false, error: "❌ Database not connected" });
  }
});

// ---------------- 404 HANDLER ----------------
app.use((req, res) => res.status(404).json({ error: "Not Found" }));

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`✅ Server running on port ${PORT}`);
  try {
    const test = await pool.query("SELECT NOW()");
    console.log("✅ PostgreSQL connected successfully at:", test.rows[0].now);
  } catch (err) {
    console.error("❌ PostgreSQL connection failed:", err);
  }
});
