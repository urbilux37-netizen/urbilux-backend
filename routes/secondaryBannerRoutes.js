const express = require("express");
const router = express.Router();
const pool = require("../db");
const multer = require("multer");
const path = require("path");

/* =============================
   MULTER CONFIG (same pattern)
============================= */
const storage = multer.diskStorage({
  destination: "uploads/secondary-banners",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});

const upload = multer({ storage });

/* =============================
   GET ALL ACTIVE BANNERS
============================= */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM secondary_banners WHERE is_active=true ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Fetch secondary banners error:", err);
    res.status(500).json({ error: "Failed to fetch banners" });
  }
});

/* =============================
   ADD NEW BANNER (ADMIN)
============================= */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image is required" });
    }

    const imageUrl = `/uploads/secondary-banners/${req.file.filename}`;

    const result = await pool.query(
      "INSERT INTO secondary_banners (image_url) VALUES ($1) RETURNING *",
      [imageUrl]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Add secondary banner error:", err);
    res.status(500).json({ error: "Failed to add banner" });
  }
});

/* =============================
   DELETE BANNER (ADMIN)
============================= */
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM secondary_banners WHERE id=$1", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Delete secondary banner error:", err);
    res.status(500).json({ error: "Failed to delete banner" });
  }
});

module.exports = router;
