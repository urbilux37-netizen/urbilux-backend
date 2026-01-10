// routes/blog.js
const express = require("express");
const router = express.Router();
const pool = require("../db"); // bannerRoutes এর মতোই

// 🔹 Helper: map blog row (clean response)
function mapBlog(row) {
  return {
    id: row.id,
    title: row.title,
    image_url: row.image_url,
    content: row.content,
    created_at: row.created_at,
  };
}

/* =========================================
   GET /api/blogs  -> সব blog (card view)
========================================= */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, image_url, created_at
       FROM blogs
       ORDER BY created_at DESC`
    );

    res.json(result.rows.map(mapBlog));
  } catch (err) {
    console.error("GET /api/blogs error:", err);
    res.status(500).json({ message: "Failed to fetch blogs" });
  }
});

/* =========================================
   GET /api/blogs/:id  -> single blog details
========================================= */
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, title, image_url, content, created_at
       FROM blogs
       WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.json(mapBlog(result.rows[0]));
  } catch (err) {
    console.error("GET /api/blogs/:id error:", err);
    res.status(500).json({ message: "Failed to fetch blog" });
  }
});

/* =========================================
   POST /api/blogs  -> create blog
   JSON only (same as banner):
   { title, image_url, content }
========================================= */
router.post("/", async (req, res) => {
  try {
    const { title = "", image_url, content = "" } = req.body;

    // ✅ banner এর মতো image_url required
    if (!image_url) {
      return res.status(400).json({ message: "image_url is required" });
    }

    const result = await pool.query(
      `INSERT INTO blogs (title, image_url, content)
       VALUES ($1, $2, $3)
       RETURNING id, title, image_url, content, created_at`,
      [title, image_url, content]
    );

    res.status(201).json(mapBlog(result.rows[0]));
  } catch (err) {
    console.error("POST /api/blogs error:", err);
    res.status(500).json({ message: "Failed to create blog" });
  }
});

/* =========================================
   PUT /api/blogs/:id  -> update blog
========================================= */
router.put("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { title = "", image_url, content = "" } = req.body;

    if (!image_url) {
      return res.status(400).json({ message: "image_url is required" });
    }

    const result = await pool.query(
      `UPDATE blogs
       SET title = $1,
           image_url = $2,
           content = $3
       WHERE id = $4
       RETURNING id, title, image_url, content, created_at`,
      [title, image_url, content, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.json(mapBlog(result.rows[0]));
  } catch (err) {
    console.error("PUT /api/blogs/:id error:", err);
    res.status(500).json({ message: "Failed to update blog" });
  }
});

/* =========================================
   DELETE /api/blogs/:id
========================================= */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM blogs WHERE id = $1",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/blogs/:id error:", err);
    res.status(500).json({ message: "Failed to delete blog" });
  }
});

module.exports = router;
