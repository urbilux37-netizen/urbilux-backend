// routes/cart.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { getUserOrGuest } = require("../middleware/authMiddleware");

// ✅ Debug: confirm file loaded
console.log("✅ Cart routes loaded!");

// 🔧 Helper: Env safe cookie options
const isProd = process.env.NODE_ENV === "production";
const cookieOpts = {
  httpOnly: true,
  sameSite: isProd ? "None" : "Lax",
  secure: isProd,
  maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
};

// 🔧 Helper: Ensure we have an owner (fallback if middleware fails)
function ensureOwner(req, res) {
  if (req.cartOwner && req.cartOwner.id) return req.cartOwner;

  // fallback guest session
  let sid = req.cookies?.guest_session;
  if (!sid) {
    // simple random guest id
    sid = "guest_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    res.cookie("guest_session", sid, cookieOpts);
  }
  const owner = { type: "guest", id: sid };
  req.cartOwner = owner;
  return owner;
}

/* ================================
   1) GET CART (User বা Guest)
================================ */
router.get("/", getUserOrGuest, async (req, res) => {
  const owner = ensureOwner(req, res);

  try {
    console.log("🧾 CART OWNER:", owner);

    let query, params;

    if (owner.type === "user") {
      query = `
        SELECT 
          c.id,
          c.product_id,
          c.quantity,
          p.name,
          p.price,
          p.image_url,
          p.discount_percent
        FROM carts c
        JOIN products p ON p.id = c.product_id
        WHERE c.user_id = $1
        ORDER BY c.id DESC`;
      params = [owner.id];
    } else {
      query = `
        SELECT 
          c.id,
          c.product_id,
          c.quantity,
          p.name,
          p.price,
          p.image_url,
          p.discount_percent
        FROM carts c
        JOIN products p ON p.id = c.product_id
        WHERE c.session_id = $1
        ORDER BY c.id DESC`;
      params = [owner.id];
    }

    const result = await db.query(query, params);
    res.json({ cart: result.rows });
  } catch (err) {
    console.error("❌ GET CART ERROR:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

/* ================================
   2) ADD TO CART
   - Accepts both {productId} or {product_id}
================================ */
router.post("/add", getUserOrGuest, async (req, res) => {
  const owner = ensureOwner(req, res);

  const {
    product_id,
    quantity,
    final_price,
    final_image,
    selected_variants
  } = req.body;

  try {
    if (!product_id) {
      return res.status(400).json({ error: "Missing product_id" });
    }

    const qty = Math.max(1, Number(quantity || 1));

    // CHECK: product exists?
    const productExists = await db.query("SELECT id FROM products WHERE id=$1", [
      product_id,
    ]);
    if (productExists.rowCount === 0) {
      return res.status(400).json({ error: "Product not found" });
    }

    // Insert new row ALWAYS — variant based products must be separate
    if (owner.type === "user") {
      await db.query(
        `INSERT INTO carts(user_id, product_id, quantity, price, image_url, variants)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [
          owner.id,
          product_id,
          qty,
          final_price,
          final_image,
          JSON.stringify(selected_variants || {}),
        ]
      );
    } else {
      await db.query(
        `INSERT INTO carts(session_id, product_id, quantity, price, image_url, variants)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [
          owner.id,
          product_id,
          qty,
          final_price,
          final_image,
          JSON.stringify(selected_variants || {}),
        ]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ CART ADD ERROR:", err);
    res.status(500).json({ error: "Failed to add to cart" });
  }
});


/* ================================
   3) UPDATE QUANTITY
================================ */
router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const quantity = Number(req.body.quantity);

  if (!quantity || quantity < 1) {
    return res.status(400).json({ error: "Quantity must be >= 1" });
  }

  try {
    const updated = await db.query(
      "UPDATE carts SET quantity=$1, updated_at=now() WHERE id=$2 RETURNING *",
      [quantity, id]
    );

    if (updated.rowCount === 0) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    res.json({ success: true, item: updated.rows[0] });
  } catch (err) {
    console.error("❌ UPDATE QUANTITY ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================================
   4) REMOVE ITEM (explicit route)
================================ */
router.delete("/remove/:id", async (req, res) => {
  const { id } = req.params;
  console.log("🗑 DELETE /remove/:id →", id);

  try {
    const deleted = await db.query("DELETE FROM carts WHERE id=$1 RETURNING *", [id]);

    if (deleted.rowCount === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    console.log("✅ Item removed:", id);
    res.json({ success: true, message: "Item removed from cart" });
  } catch (err) {
    console.error("❌ REMOVE CART ITEM ERROR:", err);
    res.status(500).json({ error: "Failed to remove item" });
  }
});

/* ================================
   5) DELETE CART ITEM (fallback)
================================ */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  console.log("🗑 DELETE /:id →", id);
  try {
    const deleted = await db.query("DELETE FROM carts WHERE id=$1 RETURNING *", [id]);
    if (deleted.rowCount === 0) {
      return res.status(404).json({ error: "Item not found" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE /cart/:id ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
