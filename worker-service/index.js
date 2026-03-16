const express = require("express");
const app = express();

const PORT = process.env.PORT || 3002;

const jobs = [];
let nextJobId = 1;

function log(message, data = {}) {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      service: "tetris-analytics-worker",
      message,
      ...data,
    })
  );
}

const stats = {
  gamesProcessed: 0,
  totalScore: 0,
  totalLines: 0,
  highestScore: 0,
  averageScore: 0,
};

function processGameEvent(job) {
  job.status = "processing";
  job.startedAt = new Date().toISOString();
  log("Processing game event", { jobId: job.id, type: job.type });

  const duration = Math.random() * 2000 + 500;
  setTimeout(() => {
    if (job.type === "game_completed") {
      stats.gamesProcessed++;
      stats.totalScore += job.payload.score || 0;
      stats.totalLines += job.payload.lines || 0;
      if ((job.payload.score || 0) > stats.highestScore) {
        stats.highestScore = job.payload.score;
      }
      stats.averageScore = Math.round(stats.totalScore / stats.gamesProcessed);
    }

    job.status = "completed";
    job.completedAt = new Date().toISOString();
    job.result = { success: true, duration: Math.round(duration) };
    log("Game event processed", { jobId: job.id, type: job.type, duration: Math.round(duration) });
  }, duration);
}

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "tetris-analytics-worker",
    uptime: process.uptime(),
    jobs: {
      total: jobs.length,
      pending: jobs.filter((j) => j.status === "pending").length,
      processing: jobs.filter((j) => j.status === "processing").length,
      completed: jobs.filter((j) => j.status === "completed").length,
    },
  });
});

app.get("/stats", (req, res) => {
  res.json(stats);
});

app.get("/jobs", (req, res) => {
  res.json(jobs);
});

app.get("/jobs/:id", (req, res) => {
  const job = jobs.find((j) => j.id === parseInt(req.params.id));
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

app.post("/jobs", (req, res) => {
  const { type, payload } = req.body;
  const validTypes = ["game_completed", "game_started", "line_cleared", "level_up"];
  if (!type) return res.status(400).json({ error: "Job type is required" });
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` });
  }

  const job = {
    id: nextJobId++,
    type,
    payload: payload || {},
    status: "pending",
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    result: null,
  };
  jobs.push(job);
  log("Game event enqueued", { jobId: job.id, type: job.type });

  processGameEvent(job);
  res.status(201).json(job);
});

app.listen(PORT, () => {
  log("Server started", { port: PORT });
  // Initialize analytics pipeline
  initializeAnalyticsPipeline();
});
