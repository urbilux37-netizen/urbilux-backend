const express = require("express");
const router = express.Router();
const pool = require("../db");

// TODO: jodi admin middleware thake, ekhane use koro
// const { requireAdmin } = require("../middleware/authMiddleware");

/* ================================
   1) PUBLIC: Get active tickers
   GET /api/tickers
================================ */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, text
       FROM header_tickers
       WHERE is_active = TRUE
       ORDER BY sort_order ASC, created_at DESC`
    );

    const messages = result.rows.map((row) => row.text);
    res.json({ messages });
  } catch (err) {
    console.error("Error fetching tickers:", err);
    res.status(500).json({ error: "Failed to fetch tickers" });
  }
});

/* ================================
   2) ADMIN: Get all tickers
   GET /api/admin/tickers
================================ */
router.get("/admin/all", async (req, res) => {
  try {
    // ekhane jodi admin auth use koro:
    // if (!req.user || !req.user.is_admin) return res.status(403).json({ error: "Forbidden" });

    const result = await pool.query(
      `SELECT id, text, is_active, sort_order,
              created_at, updated_at
       FROM header_tickers
       ORDER BY sort_order ASC, created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching admin tickers:", err);
    res.status(500).json({ error: "Failed to fetch admin tickers" });
  }
});

/* ================================
   3) ADMIN: Create new ticker
   POST /api/admin/tickers
   Body: { text, is_active?, sort_order? }
================================ */
router.post("/admin", async (req, res) => {
  const { text, is_active = true, sort_order = 0 } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Text is required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO header_tickers (text, is_active, sort_order)
       VALUES ($1, $2, $3)
       RETURNING id, text, is_active, sort_order, created_at, updated_at`,
      [text.trim(), is_active, sort_order]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating ticker:", err);
    res.status(500).json({ error: "Failed to create ticker" });
  }
});

/* ================================
   4) ADMIN: Update ticker
   PUT /api/admin/tickers/:id
   Body: { text?, is_active?, sort_order? }
================================ */
router.put("/admin/:id", async (req, res) => {
  const { id } = req.params;
  const { text, is_active, sort_order } = req.body;

  try {
    const result = await pool.query(
      `UPDATE header_tickers
       SET 
         text = COALESCE($1, text),
         is_active = COALESCE($2, is_active),
         sort_order = COALESCE($3, sort_order),
         updated_at = NOW()
       WHERE id = $4
       RETURNING id, text, is_active, sort_order, created_at, updated_at`,
      [
        text !== undefined ? text.trim() : null,
        is_active !== undefined ? is_active : null,
        sort_order !== undefined ? sort_order : null,
        id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Ticker not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating ticker:", err);
    res.status(500).json({ error: "Failed to update ticker" });
  }
});

/* ================================
   5) ADMIN: Delete ticker
   DELETE /api/admin/tickers/:id
================================ */
router.delete("/admin/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM header_tickers WHERE id = $1",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Ticker not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting ticker:", err);
    res.status(500).json({ error: "Failed to delete ticker" });
  }
});

/* ================================
   6) ADMIN: Quick toggle active
   PATCH /api/admin/tickers/:id/toggle
================================ */
router.patch("/admin/:id/toggle", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE header_tickers
       SET is_active = NOT is_active,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, text, is_active, sort_order`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Ticker not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error toggling ticker:", err);
    res.status(500).json({ error: "Failed to toggle ticker" });
  }
});

module.exports = router;
