const express = require("express");
const router = express.Router();
const pool = require("../db");

// PUBLIC — get active secondary tickers
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT text FROM secondary_tickers WHERE is_active = TRUE ORDER BY sort_order ASC`
    );
    res.json({ messages: result.rows.map((r) => r.text) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load secondary tickers" });
  }
});

// ADMIN — get all
router.get("/admin/all", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM secondary_tickers ORDER BY sort_order ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load secondary tickers" });
  }
});

// ADMIN — create
router.post("/admin", async (req, res) => {
  const { text, is_active = true, sort_order = 0 } = req.body;

  if (!text || !text.trim()) return res.status(400).json({ error: "Text required" });

  try {
    const data = await pool.query(
      `INSERT INTO secondary_tickers (text, is_active, sort_order)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [text, is_active, sort_order]
    );
    res.json(data.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create secondary ticker" });
  }
});

// ADMIN — update
router.put("/admin/:id", async (req, res) => {
  const { text, is_active, sort_order } = req.body;

  try {
    const data = await pool.query(
      `UPDATE secondary_tickers
       SET text = COALESCE($1, text),
           is_active = COALESCE($2, is_active),
           sort_order = COALESCE($3, sort_order),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [text, is_active, sort_order, req.params.id]
    );

    res.json(data.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

// ADMIN — delete
router.delete("/admin/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM secondary_tickers WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// ADMIN — toggle
router.patch("/admin/:id/toggle", async (req, res) => {
  try {
    const data = await pool.query(
      `UPDATE secondary_tickers
       SET is_active = NOT is_active
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );
    res.json(data.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Toggle failed" });
  }
});

module.exports = router;
