const express = require("express");
const app = express();

// JSON logger function
function logJSON(level, message, data = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level,
    message: message,
    ...data,
  };
  console.log(JSON.stringify(logEntry));
}

// Log application startup
logJSON("info", "Starting Tetris application", {
  nodeVersion: process.version,
  environment: process.env.NODE_ENV || "development",
});

app.use(express.static("public"));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    logJSON("info", "HTTP request processed", {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
      duration: `${duration}ms`,
    });
  });

  next();
});

app.get("/", (req, res) => {
  logJSON("info", "Root endpoint accessed", {
    endpoint: "/",
    method: "GET",
  });
  res.send("Tetris time");
});

var sponsor = process.env.SPONSOR || "unsponsor";

app.listen(3000, () => {
  logJSON("info", "Server started successfully", {
    port: 3000,
    sponsor: sponsor,
    pid: process.pid,
  });
});
