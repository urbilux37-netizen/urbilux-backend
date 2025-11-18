const express = require("express");
const router = express.Router();
const pool = require("../db");
const { adminOnly } = require("../middleware/authMiddleware");

// SAVE TOKEN
router.post("/save-token", adminOnly, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token)
      return res.status(400).json({ error: "FCM token missing" });

    await pool.query(
      "UPDATE users SET fcm_token=$1 WHERE id=$2",
      [token, req.user.id]
    );

    res.json({ success: true, message: "Token saved!" });
  } catch (err) {
    console.error("❌ FCM Save Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
