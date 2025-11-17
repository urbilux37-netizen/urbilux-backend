// routes/orders.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

// 🌐 Helper: check environment for cookie policy
const isProd = process.env.NODE_ENV === "production";

/* ===========================================================
   ✅ GET USER ORDERS (My Orders)
=========================================================== */
router.get("/", async (req, res) => {
  const token = req.cookies.token;

  // 🔐 JWT cookie check
  if (!token) {
    return res.status(401).json({ error: "Unauthorized - No token found" });
  }

  try {
    // 🔍 Verify user from token
    const decoded = jwt.verify(token, JWT_SECRET);

    // 🔹 Fetch orders for user (keep your exact query)
    const orders = await pool.query(
      "SELECT * FROM orders WHERE user_id=$1 ORDER BY id DESC",
      [decoded.id]
    );

    // 🔹 Parse items & customer if stored as JSON text (Render-safe)
    const safeOrders = orders.rows.map((o) => ({
      ...o,
      items: typeof o.items === "string" ? JSON.parse(o.items) : o.items,
      customer:
        typeof o.customer === "string" ? JSON.parse(o.customer) : o.customer,
    }));

    // ✅ Return clean data
    res.json({ success: true, orders: safeOrders });
  } catch (err) {
    console.error("❌ FETCH ORDERS ERROR:", err);
    res
      .status(500)
      .json({ error: "Server error while fetching orders", details: err.message });
  }
});

/* ===========================================================
   ✅ ADMIN - GET ALL ORDERS
=========================================================== */
router.get("/admin/all", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");

    const safeOrders = result.rows.map((row) => ({
      ...row,
      items: typeof row.items === "string" ? JSON.parse(row.items) : row.items,
      customer:
        typeof row.customer === "string"
          ? JSON.parse(row.customer)
          : row.customer,
    }));

    res.json({ success: true, orders: safeOrders });
  } catch (err) {
    console.error("❌ ADMIN FETCH ORDERS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch admin orders" });
  }
});

/* ===========================================================
   ✅ ADMIN - UPDATE ORDER STATUS
=========================================================== */
router.put("/admin/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status field is required" });
  }

  try {
    const updated = await pool.query(
      "UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
      [status, id]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ success: true, order: updated.rows[0] });
  } catch (err) {
    console.error("❌ UPDATE STATUS ERROR:", err);
    res.status(500).json({ error: "Server error while updating order status" });
  }
});

/* ===========================================================
   ✅ DEBUG - COOKIE TEST (optional)
=========================================================== */
router.get("/debug/cookie", (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    cookies: req.cookies,
    message: "Cookie debug route active",
  });
});
/* ===========================================================
   ✅ ADMIN - SEND ORDER TO PACKZY COURIER (1-Click)
=========================================================== */
const { createPackzyOrder } = require("../services/packzy");

router.post("/admin/:id/send-packzy", async (req, res) => {
  const { id } = req.params;

  try {
    // 1) Order fetch
    const result = await pool.query("SELECT * FROM orders WHERE id=$1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    let order = result.rows[0];

    // ensure correct parse
    order.items =
      typeof order.items === "string" ? JSON.parse(order.items) : order.items;

    order.customer =
      typeof order.customer === "string"
        ? JSON.parse(order.customer)
        : order.customer;

    // 2) Send to Packzy API
    const apiResponse = await createPackzyOrder(order);

    // 3) Save tracking code in DB
    await pool.query(
      "UPDATE orders SET courier=$1, courier_tracking=$2, courier_status=$3 WHERE id=$4",
      ["Packzy", apiResponse.tracking_code, "submitted", id]
    );

    res.json({
      success: true,
      message: "Order sent to Packzy successfully!",
      tracking: apiResponse.tracking_code,
      api: apiResponse,
    });
  } catch (error) {
    console.error("❌ SEND PACKZY ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send order to Packzy",
      error: error.response?.data || error.message,
    });
  }
});

module.exports = router;
