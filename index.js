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
logJSON("info", "Starting a Tetris application", {
  system: {
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    environment: {
      name: process.env.NODE_ENV || "development",
      variables: {
        sponsor: process.env.SPONSOR || "unsponsor",
        port: process.env.PORT || 3000,
      },
    },
    memory: {
      usage: process.memoryUsage(),
      uptime: process.uptime(),
    },
  },
  application: {
    name: "tetris-app",
    version: "1.0.0",
    features: {
      staticFiles: true,
      jsonLogging: true,
      requestTracking: true,
    },
  },
});

app.use(express.static("public"));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    logJSON("info", "HTTP request processed", {
      request: {
        method: req.method,
        url: req.url,
        headers: {
          userAgent: req.get("User-Agent"),
          contentType: req.get("Content-Type"),
          accept: req.get("Accept"),
          host: req.get("Host"),
        },
        client: {
          ip: req.ip,
          ips: req.ips,
          protocol: req.protocol,
          secure: req.secure,
        },
        query: req.query,
        params: req.params,
      },
      response: {
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        headers: {
          contentType: res.get("Content-Type"),
          contentLength: res.get("Content-Length"),
        },
      },
      performance: {
        duration: {
          ms: duration,
          seconds: duration / 1000,
        },
        timestamp: {
          start: new Date(startTime).toISOString(),
          end: new Date().toISOString(),
        },
      },
      server: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
      },
    });
  });

  next();
});

app.get("/", (req, res) => {
  logJSON("info", "Root endpoint accessed...", {
    route: {
      path: "/",
      method: "GET",
      handler: "root",
    },
    context: {
      session: {
        id: req.sessionID || "anonymous",
        isAuthenticated: false,
        user: null,
      },
      game: {
        name: "Tetris",
        mode: "classic",
        features: {
          multiplayer: false,
          leaderboard: true,
          customization: true,
        },
        assets: {
          sounds: ["bravo.mp3", "gameover.mp3", "lock.mp3"],
          scripts: ["tetris.js", "piece.js", "stack.js"],
          styles: ["style.css", "ui.css"],
        },
      },
      server: {
        sponsor: process.env.SPONSOR || "unsponsor",
        deployment: {
          environment: process.env.NODE_ENV || "development",
          version: "1.0.0",
          buildTime: new Date().toISOString(),
        },
      },
    },
  });
  res.send("Tetris time");
});

var sponsor = process.env.SPONSOR || "unsponsor";

app.listen(3000, () => {
  logJSON("info", "Server started successfully!", {
    server: {
      network: {
        port: 3000,
        host: "localhost",
        protocol: "http",
        urls: {
          local: "http://localhost:3000",
          network: `http://${
            require("os").networkInterfaces().en0?.[0]?.address || "127.0.0.1"
          }:3000`,
        },
      },
      process: {
        pid: process.pid,
        title: process.title,
        versions: process.versions,
        execPath: process.execPath,
        argv: process.argv,
      },
      resources: {
        memory: {
          usage: process.memoryUsage(),
          limit:
            process.env.NODE_OPTIONS?.includes("--max-old-space-size") ||
            "default",
        },
        cpu: {
          usage: process.cpuUsage(),
          architecture: process.arch,
        },
      },
    },
    application: {
      metadata: {
        name: "tetris-app",
        sponsor: sponsor,
        version: "1.0.0",
        startTime: new Date().toISOString(),
      },
      configuration: {
        environment: process.env.NODE_ENV || "development",
        features: {
          staticFiles: true,
          jsonLogging: true,
          requestTracking: true,
          errorHandling: false,
        },
        paths: {
          static: "/public",
          assets: {
            sounds: "/public/se/",
            scripts: "/public/",
            styles: "/public/",
          },
        },
      },
    },
    deployment: {
      platform: process.platform,
      container: {
        dockerized: !!process.env.DOCKER_CONTAINER,
        kubernetes: !!process.env.KUBERNETES_SERVICE_HOST,
      },
      cloud: {
        provider: process.env.CLOUD_PROVIDER || "local",
        region: process.env.CLOUD_REGION || "unknown",
      },
    },
  });
});
