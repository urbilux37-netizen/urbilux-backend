const express = require("express");
const router = express.Router();
const pool = require("../db");

// Helper
function mapBanner(row) {
  return {
    id: row.id,
    image_url: row.image_url,
    created_at: row.created_at,
  };
}

// GET /api/secondary-banners
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, image_url, created_at FROM secondary_banners ORDER BY id DESC"
    );
    res.json(result.rows.map(mapBanner));
  } catch (err) {
    console.error("GET /api/secondary-banners error:", err);
    res.status(500).json({ message: "Failed to fetch banners" });
  }
});

// POST /api/secondary-banners
router.post("/", async (req, res) => {
  try {
    const { image_url } = req.body;

    if (!image_url) return res.status(400).json({ message: "image_url required" });

    const result = await pool.query(
      "INSERT INTO secondary_banners (image_url) VALUES ($1) RETURNING id, image_url, created_at",
      [image_url]
    );

    res.status(201).json(mapBanner(result.rows[0]));
  } catch (err) {
    console.error("POST /api/secondary-banners error:", err);
    res.status(500).json({ message: "Failed to add banner" });
  }
});

// DELETE /api/secondary-banners/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM secondary_banners WHERE id=$1", [id]);

    if (result.rowCount === 0)
      return res.status(404).json({ message: "Banner not found" });

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/secondary-banners/:id error:", err);
    res.status(500).json({ message: "Failed to delete banner" });
  }
});

module.exports = router;
