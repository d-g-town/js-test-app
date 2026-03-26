const { SQSClient, SendMessageBatchCommand, GetQueueAttributesCommand } = require("@aws-sdk/client-sqs");
const express = require("express");

const QUEUE_URL = process.env.SQS_QUEUE_URL;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const PORT = parseInt(process.env.PRODUCER_PORT) || 8081;
const BATCH_SIZE = 10; // SQS max per batch

if (!QUEUE_URL) {
  console.error("SQS_QUEUE_URL environment variable is required");
  process.exit(1);
}

const sqs = new SQSClient({ region: AWS_REGION });
const app = express();
app.use(express.json());

let messageCount = parseInt(process.env.MESSAGE_COUNT) || 100;

function makeMessage(i) {
  return {
    action: "process_item",
    itemId: `item-${Date.now()}-${i}`,
    priority: Math.random() > 0.8 ? "high" : "normal",
    payload: {
      value: Math.floor(Math.random() * 1000),
      tags: ["keda-test", "autoscale"],
    },
    createdAt: new Date().toISOString(),
  };
}

async function getQueueDepth() {
  const resp = await sqs.send(new GetQueueAttributesCommand({
    QueueUrl: QUEUE_URL,
    AttributeNames: ["ApproximateNumberOfMessages", "ApproximateNumberOfMessagesNotVisible"],
  }));
  return {
    visible: parseInt(resp.Attributes.ApproximateNumberOfMessages),
    inFlight: parseInt(resp.Attributes.ApproximateNumberOfMessagesNotVisible),
  };
}

async function produce(count) {
  let sent = 0;
  for (let i = 0; i < count; i += BATCH_SIZE) {
    const batchCount = Math.min(BATCH_SIZE, count - i);
    const entries = [];
    for (let j = 0; j < batchCount; j++) {
      entries.push({
        Id: `msg-${i + j}`,
        MessageBody: JSON.stringify(makeMessage(i + j)),
      });
    }

    await sqs.send(new SendMessageBatchCommand({
      QueueUrl: QUEUE_URL,
      Entries: entries,
    }));

    sent += batchCount;
  }
  return sent;
}

// POST /produce — send messages, optionally override count in body
// curl -X POST http://localhost:8081/produce -H 'Content-Type: application/json' -d '{"messageCount": 500}'
app.post("/produce", async (req, res) => {
  const count = req.body.messageCount || messageCount;
  console.log(`Producing ${count} messages...`);
  try {
    const sent = await produce(count);
    const depth = await getQueueDepth();
    res.json({ sent, queueDepth: depth });
  } catch (err) {
    console.error("Produce failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /config — update the default messageCount
// curl -X POST http://localhost:8081/config -H 'Content-Type: application/json' -d '{"messageCount": 300}'
app.post("/config", (req, res) => {
  if (req.body.messageCount != null) {
    const prev = messageCount;
    messageCount = parseInt(req.body.messageCount);
    console.log(`messageCount updated: ${prev} -> ${messageCount}`);
  }
  res.json({ messageCount });
});

// GET /config — see current settings
app.get("/config", (req, res) => {
  res.json({ messageCount, queueUrl: QUEUE_URL, region: AWS_REGION });
});

// GET /queue — check current queue depth
app.get("/queue", async (req, res) => {
  try {
    const depth = await getQueueDepth();
    res.json(depth);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/healthz", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`SQS producer listening on port ${PORT}`);
  console.log(`Default messageCount: ${messageCount}`);
  console.log(`Queue: ${QUEUE_URL}`);
});
