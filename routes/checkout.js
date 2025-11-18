const adminSdk = require("../firebase");

const express = require("express");
const router = express.Router();
const pool = require("../db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { getUserOrGuest } = require("../middleware/authMiddleware");
const { createPackzyOrder } = require("../services/packzy");

const JWT_SECRET = process.env.JWT_SECRET;
const isProd = process.env.NODE_ENV === "production";
async function notifyAdminsNewOrder(total) {
  try {
    const admins = await pool.query(
      "SELECT fcm_token FROM users WHERE role='admin' AND fcm_token IS NOT NULL"
    );

    if (admins.rows.length === 0) return;

    const tokens = admins.rows.map(a => a.fcm_token);

    const message = {
      notification: {
        title: "New Order Received",
        body: `Total Amount: ৳${total}`,
      },
      tokens,
    };

    await adminSdk.messaging().sendMulticast(message);
    console.log("📩 Notification sent to admins:", tokens.length);
  } catch (err) {
    console.error("❌ Push Notification Error:", err);
  }
}

/* ===========================================================
   ✅ PLACE ORDER (Auto user create if guest + manual payment)
=========================================================== */
router.post("/", getUserOrGuest, async (req, res) => {
  const { items, total, customer, payment_method, online_payment } = req.body;

  if (!items || !total || !customer) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let userId = null;

    // 🔹 1️⃣ Check if user already logged in
    const token = req.cookies.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        console.log("⚠️ Invalid token, will create new user if needed...");
      }
    }

    // 🔹 2️⃣ If not logged in, create or find user by phone
    if (!userId && customer.phone) {
      const phone = customer.phone;
      const email = `${phone}@auto.avado.com`;
      const password = phone;

      const existingUser = await client.query(
        "SELECT id FROM users WHERE phone=$1",
        [phone]
      );

      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id;
        console.log("🔁 Existing user found:", phone);
      } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await client.query(
          "INSERT INTO users (email, phone, password) VALUES ($1,$2,$3) RETURNING id",
          [email, phone, hashedPassword]
        );
        userId = newUser.rows[0].id;

        // 🔹 Set JWT Cookie for auto login
        const newToken = jwt.sign({ id: userId }, JWT_SECRET, {
          expiresIn: "7d",
        });

        res.cookie("token", newToken, {
          httpOnly: true,
          secure: true,
          sameSite: "None",
          domain: "urbilux-backend.onrender.com",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        console.log("✅ New user created & logged in:", phone);
      }
    }

    // 🔹 3️⃣ Price fix (with discount)
    const fixedItems = items.map((item) => {
      let price = Number(item.price);
      if (item.discount_percent) {
        price = price - (price * Number(item.discount_percent)) / 100;
      }
      return { ...item, price };
    });

    // 🔹 4️⃣ Prepare optional payment info
    let paymentInfo = null;
    let status = "pending";

    if (payment_method === "Online Payment" && online_payment) {
      paymentInfo = {
        method: online_payment.method,
        amount: Number(online_payment.amount || 0),
        last2: online_payment.last2,
        note: online_payment.note || "Manual payment verification pending",
      };
      status = "pending_payment";
    }

    // 🔹 5️⃣ Insert order
    const insertQuery = `
      INSERT INTO orders (
        user_id, session_id, items, total, customer, payment_method, online_payment, status, order_date, created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
      RETURNING *;
    `;

    const order = await client.query(insertQuery, [
      userId,
      req.cartOwner?.id || null,
      JSON.stringify(fixedItems),
      total,
      JSON.stringify(customer),
      payment_method || "Cash on Delivery",
      paymentInfo ? JSON.stringify(paymentInfo) : null,
      status,
    ]);

    // 🔹 6️⃣ Clear cart (both user/guest)
    if (userId) {
      await client.query("DELETE FROM carts WHERE user_id=$1", [userId]);
    } else if (req.cartOwner?.id) {
      await client.query("DELETE FROM carts WHERE session_id=$1", [
        req.cartOwner.id,
      ]);
    }

    await client.query("COMMIT");
    await notifyAdminsNewOrder(total);

    console.log("✅ Order placed successfully:", order.rows[0].id);

    res.json({ success: true, order: order.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Checkout Error:", err);
    res.status(500).json({ error: "Checkout failed", details: err.message });
  } finally {
    client.release();
  }
});

/* ===========================================================
   ✅ GET USER ORDERS (My Orders)
=========================================================== */
router.get("/", async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query(
      "SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC",
      [decoded.id]
    );

    const orders = result.rows.map((row) => ({
      ...row,
      items: typeof row.items === "string" ? JSON.parse(row.items) : row.items,
      customer:
        typeof row.customer === "string"
          ? JSON.parse(row.customer)
          : row.customer,
      online_payment:
        typeof row.online_payment === "string"
          ? JSON.parse(row.online_payment)
          : row.online_payment,
    }));

    res.json({ success: true, orders });
  } catch (err) {
    console.error("❌ Fetch Orders Error:", err);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

/* ===========================================================
   ✅ ADMIN - GET ALL ORDERS
=========================================================== */
router.get("/admin/all", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM orders ORDER BY created_at DESC"
    );
    const orders = result.rows.map((row) => ({
      ...row,
      items: typeof row.items === "string" ? JSON.parse(row.items) : row.items,
      customer:
        typeof row.customer === "string"
          ? JSON.parse(row.customer)
          : row.customer,
      online_payment:
        typeof row.online_payment === "string"
          ? JSON.parse(row.online_payment)
          : row.online_payment,
    }));
    res.json({ success: true, orders });
  } catch (err) {
    console.error("❌ Admin Get Orders Error:", err);
    res.status(500).json({ error: "Failed to fetch admin orders" });
  }
});

/* ===========================================================
   ✅ ADMIN - UPDATE ORDER STATUS
=========================================================== */
router.put("/admin/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Status is required" });

  try {
    const result = await pool.query(
      "UPDATE orders SET status=$1 WHERE id=$2 RETURNING *",
      [status, id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Order not found" });

    res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    console.error("❌ Update Status Error:", err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});
/* ===========================================================
   ✅ ADMIN - SEND ORDER TO PACKZY COURIER (1-Click)
=========================================================== */
router.post("/admin/:id/send-packzy", async (req, res) => {
  const { id } = req.params;

  try {
    // 1) Order fetch
    const result = await pool.query("SELECT * FROM orders WHERE id=$1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    let order = result.rows[0];

    // Make sure JSON fields are parsed
    order.items =
      typeof order.items === "string" ? JSON.parse(order.items) : order.items;

    order.customer =
      typeof order.customer === "string"
        ? JSON.parse(order.customer)
        : order.customer;

    // 2) Send to Packzy
    const apiResponse = await createPackzyOrder(order);

    // 3) Save tracking code
    await pool.query(
      "UPDATE orders SET courier=$1, courier_tracking=$2, courier_status=$3 WHERE id=$4",
      ["Packzy", apiResponse.tracking_code, "submitted", id]
    );

    res.json({
      success: true,
      message: "Order sent to Packzy successfully!",
      tracking: apiResponse.tracking_code,
      courier_response: apiResponse,
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
