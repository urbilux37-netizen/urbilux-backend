const express = require("express");
const pool = require("../db");
const router = express.Router();

// Today
router.get("/visits-today", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) AS total
      FROM visit_logs
      WHERE visited_at::date = CURRENT_DATE
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Today Error:", err);
    res.status(500).json({ error: "Server Error" });
  }
});

// Last 7 days
router.get("/visits-7days", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) AS total
      FROM visit_logs
      WHERE visited_at >= NOW() - INTERVAL '7 days'
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("7 Days Error:", err);
    res.status(500).json({ error: "Server Error" });
  }
});

// Last 30 days
router.get("/visits-30days", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) AS total
      FROM visit_logs
      WHERE visited_at >= NOW() - INTERVAL '30 days'
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("30 Days Error:", err);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
