// routes/bannerRoutes.js
const express = require("express");
const router = express.Router();
const pool = require("../db"); // <-- তুমি যেটা ব্যবহার করো, সেটাই রাখো

// 🔹 Helper: map db row (optional)
function mapBanner(row) {
  return {
    id: row.id,
    title: row.title,
    image_url: row.image_url,
    slot: row.slot,
    button_text: row.button_text,
    button_link: row.button_link,
    created_at: row.created_at,
  };
}

/* =========================================
   GET /api/banners  -> সব banner
========================================= */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, image_url, slot, button_text, button_link, created_at FROM banners ORDER BY id DESC"
    );
    res.json(result.rows.map(mapBanner));
  } catch (err) {
    console.error("GET /api/banners error:", err);
    res.status(500).json({ message: "Failed to fetch banners" });
  }
});

/* =========================================
   POST /api/banners  -> নতুন banner create
   এখন আর file নয়, শুধু JSON:
   { title, button_text, button_link, slot, image_url }
========================================= */
router.post("/", async (req, res) => {
  try {
    const {
      title = "",
      button_text = "",
      button_link = "",
      slot = "main",
      image_url,
    } = req.body;

    // ✅ image_url লাগবেই (Cloudinary/R2 থেকে)
    if (!image_url) {
      return res.status(400).json({ message: "image_url is required" });
    }

    const result = await pool.query(
      `INSERT INTO banners (title, image_url, slot, button_text, button_link)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, image_url, slot, button_text, button_link, created_at`,
      [title, image_url, slot, button_text, button_link]
    );

    res.status(201).json(mapBanner(result.rows[0]));
  } catch (err) {
    console.error("POST /api/banners error:", err);
    res.status(500).json({ message: "Failed to create banner" });
  }
});

/* =========================================
   PUT /api/banners/:id  -> banner update
   এখানেও শুধু JSON body
========================================= */
router.put("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const {
      title = "",
      button_text = "",
      button_link = "",
      slot = "main",
      image_url,
    } = req.body;

    if (!image_url) {
      return res.status(400).json({ message: "image_url is required" });
    }

    const result = await pool.query(
      `UPDATE banners
       SET title = $1,
           image_url = $2,
           slot = $3,
           button_text = $4,
           button_link = $5
       WHERE id = $6
       RETURNING id, title, image_url, slot, button_text, button_link, created_at`,
      [title, image_url, slot, button_text, button_link, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Banner not found" });
    }

    res.json(mapBanner(result.rows[0]));
  } catch (err) {
    console.error("PUT /api/banners/:id error:", err);
    res.status(500).json({ message: "Failed to update banner" });
  }
});

/* =========================================
   DELETE /api/banners/:id
========================================= */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM banners WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Banner not found" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/banners/:id error:", err);
    res.status(500).json({ message: "Failed to delete banner" });
  }
});

module.exports = router;
