import express from "express";
import db from "../config/db.js";

const router = express.Router();

// Today Visitors (unique IP)
router.get("/visits-today", async (req, res) => {
  try {
    const result = await db.query(`
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

// Last 7 Days Visitors
router.get("/visits-7days", async (req, res) => {
  try {
    const result = await db.query(`
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

// Last 30 Days Visitors
router.get("/visits-30days", async (req, res) => {
  try {
    const result = await db.query(`
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

export default router;
