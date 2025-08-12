// keepalive.js
import fetch from "node-fetch";

function keepAlive() {
  setInterval(async () => {
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
  }, 10 * 60 * 1000); // 10 daqiqa = 600,000 millisekund
}

export default keepAlive;
