import express from "express";
import pool from "../db.js"; // neon postgres connection

const router = express.Router();

/**
 * CREATE BLOG (Admin)
 */
router.post("/", async (req, res) => {
  try {
    const { title, image_url, content } = req.body;

    const result = await pool.query(
      "INSERT INTO blogs (title, image_url, content) VALUES ($1,$2,$3) RETURNING *",
      [title, image_url, content]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Blog create failed" });
  }
});

/**
 * GET ALL BLOGS (Blog List)
 */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, image_url, created_at FROM blogs ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch blogs" });
  }
});

/**
 * GET SINGLE BLOG
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM blogs WHERE id=$1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Blog not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch blog" });
  }
});

export default router;
