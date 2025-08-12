// api/keepalive.js - Keep server alive
export default function handler(req, res) {
  const timestamp = new Date().toISOString();

  console.log(`🔄 Keep-alive ping received at ${timestamp}`);

  res.status(200).json({
    status: "alive",
    timestamp,
    message: "Bot server is running",
    method: req.method,
    url: req.url,
  });
}
