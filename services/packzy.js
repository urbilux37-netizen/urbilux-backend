const axios = require("axios");

async function createPackzyOrder(order) {
  try {
    const response = await axios.post(
      `${process.env.PACKZY_API_BASE}/create-order`,
      {
        invoice_id: order.id,
        recipient_name: order.customer.name,
        recipient_phone: order.customer.phone,
        delivery_address: order.customer.address,
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
    console.error("Packzy API ERROR:", error.response?.data || error.message);
    throw error;
  }
}

module.exports = { createPackzyOrder };
