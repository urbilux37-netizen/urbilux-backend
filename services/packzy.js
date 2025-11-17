const axios = require("axios");

async function createPackzyOrder(order) {
  try {
    // Base URL ঠিক ভাবে trim
    const BASE = (process.env.PACKZY_API_BASE || "")
      .trim()
      .replace(/\/$/, ""); // remove last slash

    // Correct Packzy Order Create API endpoint
    const url = `${BASE}/create_order`;

    console.log("PACKZY FINAL URL:", url);

    const fullAddress = `
${order.customer.address || ""}
${order.customer.thana ? ", " + order.customer.thana : ""}
${order.customer.upazila ? ", " + order.customer.upazila : ""}
${order.customer.district ? ", " + order.customer.district : ""}
`.trim();

    const response = await axios.post(
      url,
      {
        invoice: order.id,
        recipient_name: order.customer.name,
        recipient_phone: order.customer.phone,
        recipient_address: fullAddress,
        cod_amount: Number(order.total),
        note: "",
        item_description: "Order Items",
        total_lot: order.items.length,
        delivery_type: 0,
      },
      {
        headers: {
          "Api-Key": process.env.PACKZY_API_KEY,
          "Secret-Key": process.env.PACKZY_API_SECRET,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Packzy API ERROR:", {
      msg: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url || null,
    });
    throw error;
  }
}

module.exports = { createPackzyOrder };
