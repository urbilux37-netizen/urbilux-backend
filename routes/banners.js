// routes/banners.js
const express = require("express");
const pool = require("../db");
const router = express.Router();

// ✅ Get all banners
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM banners ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Banner fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Add new banner
router.post("/", async (req, res) => {
  try {
    const { title, image_url, button_text, button_link } = req.body;
    const result = await pool.query(
      "INSERT INTO banners (title, image_url, button_text, button_link) VALUES ($1,$2,$3,$4) RETURNING *",
      [title, image_url, button_text, button_link]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Banner add error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Update banner
router.put("/:id", async (req, res) => {
  try {
    const { title, image_url, button_text, button_link } = req.body;
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE banners SET title=$1,image_url=$2,button_text=$3,button_link=$4 WHERE id=$5 RETURNING *",
      [title, image_url, button_text, button_link, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Banner update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Delete banner
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM banners WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Banner delete error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
