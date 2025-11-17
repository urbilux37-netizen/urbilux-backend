const axios = require("axios");

async function createPackzyOrder(order) {
  try {
    // 🟣 Base URL trim + remove trailing slash (fixes invalid URL)
    const BASE = (process.env.PACKZY_API_BASE || "")
      .trim()
      .replace(/\/$/, "");

    const url = `${BASE}/create-order`;

    // Debug log
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
        invoice_id: order.id,
        recipient_name: order.customer.name,
        recipient_phone: order.customer.phone,
        delivery_address: fullAddress,
        cod_amount: order.total,
        number_of_items: order.items.length,
        note: order.note || "",
      },
      {
        headers: {
          "API-KEY": process.env.PACKZY_API_KEY,
          "SECRET-KEY": process.env.PACKZY_API_SECRET,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Packzy API ERROR:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url,
    });
    throw error;
  }
}

module.exports = { createPackzyOrder };
