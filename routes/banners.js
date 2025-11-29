// routes/banners.js
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const pool = require("../db"); // Neon Postgres Pool (already ache)

// ========= Multer setup (local /uploads/banners folder) =========

// Make sure folder exists
const uploadDir = path.join(__dirname, "..", "uploads", "banners");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// save file with timestamp + original name
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const upload = multer({ storage });

// helper: build public URL (Render + localhost duijon e kaj korbe)
function buildImageUrl(req, filename) {
  const host = req.get("host");
  const protocol = req.protocol;
  return `${protocol}://${host}/uploads/banners/${filename}`;
}

/* =========================================================
   GET /api/banners  -> all banners (order by created_at desc)
========================================================= */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, image_url, button_text, button_link, slot, created_at FROM banners ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/banners error:", err);
    res.status(500).json({ error: "Failed to fetch banners" });
  }
});

/* =========================================================
   POST /api/banners  (multipart/form-data)
   fields: image (file), title, button_text, button_link, slot
========================================================= */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "Image file is required" });
    }

    const { title, button_text, button_link, slot } = req.body;

    const imageUrl = buildImageUrl(req, file.filename);
    const safeSlot =
      slot === "side_top" || slot === "side_bottom" ? slot : "main";

    const result = await pool.query(
      `INSERT INTO banners (title, image_url, button_text, button_link, slot)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, image_url, button_text, button_link, slot, created_at`,
      [
        title || null,
        imageUrl,
        button_text || null,
        button_link || null,
        safeSlot,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("POST /api/banners error:", err);
    res.status(500).json({ error: "Failed to create banner" });
  }
});

/* =========================================================
   PUT /api/banners/:id  (multipart/form-data)
   optional: new image file
========================================================= */
router.put("/:id", upload.single("image"), async (req, res) => {
  const { id } = req.params;
  const { title, button_text, button_link, slot } = req.body;
  const file = req.file;

  try {
    // 1) get existing banner
    const existing = await pool.query(
      "SELECT image_url FROM banners WHERE id = $1",
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Banner not found" });
    }

    let imageUrl = existing.rows[0].image_url;

    // 2) if new file uploaded, replace URL
    if (file) {
      imageUrl = buildImageUrl(req, file.filename);
      // old file delete korte chaile ekhane fs.unlinkSync() diye korte paro
    }

    const safeSlot =
      slot === "side_top" || slot === "side_bottom" ? slot : "main";

    const result = await pool.query(
      `UPDATE banners
       SET title = $1,
           image_url = $2,
           button_text = $3,
           button_link = $4,
           slot = $5
       WHERE id = $6
       RETURNING id, title, image_url, button_text, button_link, slot, created_at`,
      [
        title || null,
        imageUrl,
        button_text || null,
        button_link || null,
        safeSlot,
        id,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /api/banners/:id error:", err);
    res.status(500).json({ error: "Failed to update banner" });
  }
});

/* =========================================================
   DELETE /api/banners/:id
========================================================= */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM banners WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/banners/:id error:", err);
    res.status(500).json({ error: "Failed to delete banner" });
  }
});

module.exports = router;
