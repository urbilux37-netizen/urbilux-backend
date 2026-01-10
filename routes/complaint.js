// routes/complaint.js
const express = require("express");
const router = express.Router();
const pool = require("../db");

// helper
function mapComplaint(row) {
  return {
    id: row.id,
    customer_name: row.customer_name,
    phone: row.phone,
    message: row.message,
    image_url: row.image_url,
    created_at: row.created_at,
  };
}

/* ===============================
   GET all complaints (Admin)
================================ */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM complaints ORDER BY id DESC"
    );
    res.json(result.rows.map(mapComplaint));
  } catch (err) {
    console.error("GET complaints error:", err);
    res.status(500).json({ message: "Failed to fetch complaints" });
  }
});

/* ===============================
   POST complaint (Customer)
================================ */
router.post("/", async (req, res) => {
  try {
    const {
      customer_name,
      phone,
      message,
      image_url = null,
    } = req.body;

    if (!customer_name || !phone || !message) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const result = await pool.query(
      `INSERT INTO complaints 
       (customer_name, phone, message, image_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [customer_name, phone, message, image_url]
    );

    res.status(201).json(mapComplaint(result.rows[0]));
  } catch (err) {
    console.error("POST complaint error:", err);
    res.status(500).json({ message: "Failed to submit complaint" });
  }
});

/* ===============================
   DELETE complaint (Admin)
================================ */
router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM complaints WHERE id = $1",
      [req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE complaint error:", err);
    res.status(500).json({ message: "Failed to delete complaint" });
  }
});

module.exports = router;
