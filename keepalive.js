// keepalive.js
const fetch = require("node-fetch");

async function ping() {
  try {
    const response = await fetch(`${process.env.RENDER_EXTERNAL_URL}/ping`);
    if (response.ok) {
      console.log("Ping successful at:", new Date().toISOString());
    } else {
      console.log("Ping failed with status:", response.status);
    }
  } catch (error) {
    console.error("Ping error:", error.message);
  }
}

ping(); // Faqat bir marta ishlaydi, cron boshqaradi
