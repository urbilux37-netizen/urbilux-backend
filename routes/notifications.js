// routes/notifications.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

/* ============================================
   ✅ Save FCM token for logged-in ADMIN user
   URL: POST /api/notifications/save-token
============================================ */
router.post("/save-token", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "FCM token is required" });
    }

    // 🔹 Cookie theke JWT token ber kori
    const cookieToken = req.cookies?.token;
    if (!cookieToken) {
      return res.status(401).json({ success: false, message: "Unauthorized: No auth cookie" });
    }

    let decoded;
    try {
      decoded = jwt.verify(cookieToken, JWT_SECRET);
    } catch (err) {
      console.error("❌ JWT verify error in /save-token:", err.message);
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    // 🔹 User details load + role check
    const userRes = await pool.query(
      "SELECT id, role FROM users WHERE id=$1",
      [decoded.id]
    );

    if (!userRes.rows.length) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = userRes.rows[0];

    if (user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admin can register FCM token" });
    }

    // 🔹 Upsert token (একটা user-এর একটা token)
    await pool.query(
      `
      INSERT INTO user_notification_tokens (user_id, fcm_token)
      VALUES ($1, $2)
      ON CONFLICT (user_id)
      DO UPDATE SET fcm_token = EXCLUDED.fcm_token, updated_at = NOW()
      `,
      [user.id, token]
    );

    console.log("✅ FCM token saved for admin:", user.id);

    res.json({ success: true, message: "FCM token saved successfully" });
  } catch (err) {
    console.error("❌ /save-token error:", err);
    res.status(500).json({ success: false, message: "Server error saving FCM token" });
  }
});

module.exports = router;
