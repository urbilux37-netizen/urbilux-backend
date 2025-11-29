const express = require("express");
const router = express.Router();
const pool = require("../db"); // pg Pool from your db.js

// Helper to normalize slot
function normalizeSlot(slot) {
  if (!slot) return "main";
  const s = String(slot).toLowerCase();
  if (s === "side_top" || s === "side-bottom" || s === "sidebottom") return "side_top";
  if (s === "side_bottom" || s === "side-bottom2") return "side_bottom";
  return "main";
}

/* ============================
   GET /api/banners
   All banners (for frontend)
============================ */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, image_url, button_text, button_link, slot, created_at
       FROM banners
       ORDER BY 
         CASE slot
           WHEN 'main' THEN 1
           WHEN 'side_top' THEN 2
           WHEN 'side_bottom' THEN 3
           ELSE 4
         END,
         created_at ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/banners error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================
   POST /api/banners
   Body JSON:
   { title?, image_url, button_text?, button_link?, slot? }
============================ */
router.post("/", async (req, res) => {
  try {
    let { title, image_url, button_text, button_link, slot } = req.body;

    if (!image_url) {
      return res.status(400).json({ error: "image_url is required" });
    }

    slot = normalizeSlot(slot);

    const result = await pool.query(
      `INSERT INTO banners (title, image_url, button_text, button_link, slot)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, image_url, button_text, button_link, slot, created_at`,
      [title || null, image_url, button_text || null, button_link || null, slot]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("POST /api/banners error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================
   PUT /api/banners/:id
   Partial update allowed
============================ */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let { title, image_url, button_text, button_link, slot } = req.body;

    const resultOld = await pool.query("SELECT * FROM banners WHERE id = $1", [
      id,
    ]);
    if (!resultOld.rows.length) {
      return res.status(404).json({ error: "Not found" });
    }
    const old = resultOld.rows[0];

    const newTitle = title !== undefined ? title : old.title;
    const newImage = image_url !== undefined ? image_url : old.image_url;
    const newBtnText =
      button_text !== undefined ? button_text : old.button_text;
    const newBtnLink =
      button_link !== undefined ? button_link : old.button_link;
    const newSlot =
      slot !== undefined ? normalizeSlot(slot) : old.slot;

    const result = await pool.query(
      `UPDATE banners
       SET title = $1,
           image_url = $2,
           button_text = $3,
           button_link = $4,
           slot = $5
       WHERE id = $6
       RETURNING id, title, image_url, button_text, button_link, slot, created_at`,
      [newTitle, newImage, newBtnText, newBtnLink, newSlot, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /api/banners/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================
   DELETE /api/banners/:id
============================ */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM banners WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/banners/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
