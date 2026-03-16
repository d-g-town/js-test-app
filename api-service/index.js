const express = require("express"
const app = express();

const PORT = process.env.PORT || 3001;

app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: Date.now() - start,
      })
    );
  });
  next();
});

const scores = [];
let nextId = 1;

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "tetris-scores-api", uptime: process.uptime() });
});

app.get("/api/scores", (req, res) => {
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const limit = parseInt(req.query.limit) || 10;
  res.json(sorted.slice(0, limit));
});

app.get("/api/scores/:id", (req, res) => {
  const entry = scores.find((s) => s.id === parseInt(req.params.id));
  if (!entry) return res.status(404).json({ error: "Score not found" });
  res.json(entry);
});

app.post("/api/scores", (req, res) => {
  const { player, score, level, lines } = req.body;
  if (!player || score == null) {
    return res.status(400).json({ error: "player and score are required" });
  }
  const entry = {
    id: nextId++,
    player,
    score,
    level: level || 1,
    lines: lines || 0,
    createdAt: new Date().toISOString(),
  };
  scores.push(entry);
  res.status(201).json(entry);
});

app.get("/api/leaderboard", (req, res) => {
  const topScores = [...scores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((s, i) => ({ rank: i + 1, player: s.player, score: s.score, level: s.level }));
  res.json({ leaderboard: topScores, totalPlayers: new Set(scores.map((s) => s.player)).size });
});

app.delete("/api/scores/:id", (req, res) => {
  const index = scores.findIndex((s) => s.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Score not found" });
  scores.splice(index, 1);
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`tetris-scores-api listening on port ${PORT}`);
});
