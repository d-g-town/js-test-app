const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");
const express = require("express");

const QUEUE_URL = process.env.SQS_QUEUE_URL;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS) || 1000;
const MAX_MESSAGES = parseInt(process.env.MAX_MESSAGES) || 10;
const VISIBILITY_TIMEOUT = parseInt(process.env.VISIBILITY_TIMEOUT) || 30;
const PROCESSING_TIME_MS = parseInt(process.env.PROCESSING_TIME_MS) || 2000;
const HEALTH_PORT = parseInt(process.env.HEALTH_PORT) || 8080;

if (!QUEUE_URL) {
  console.error("SQS_QUEUE_URL environment variable is required");
  process.exit(1);
}

const sqs = new SQSClient({ region: AWS_REGION });

let stats = {
  messagesReceived: 0,
  messagesProcessed: 0,
  messagesFailed: 0,
  lastMessageAt: null,
  startedAt: new Date().toISOString(),
};

function log(message, data = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    service: "sqs-keda-test-worker",
    message,
    ...data,
  }));
}

async function processMessage(message) {
  const body = JSON.parse(message.Body);
  log("Processing message", { messageId: message.MessageId, body });

  // Simulate work - configurable processing time
  await new Promise((resolve) => setTimeout(resolve, PROCESSING_TIME_MS));

  log("Message processed", { messageId: message.MessageId });
}

async function pollQueue() {
  try {
    const response = await sqs.send(new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: MAX_MESSAGES,
      WaitTimeSeconds: 20, // long polling
      VisibilityTimeout: VISIBILITY_TIMEOUT,
    }));

    const messages = response.Messages || [];

    if (messages.length > 0) {
      log(`Received ${messages.length} messages`);
      stats.messagesReceived += messages.length;
    }

    for (const message of messages) {
      try {
        await processMessage(message);

        await sqs.send(new DeleteMessageCommand({
          QueueUrl: QUEUE_URL,
          ReceiptHandle: message.ReceiptHandle,
        }));

        stats.messagesProcessed++;
        stats.lastMessageAt = new Date().toISOString();
      } catch (err) {
        stats.messagesFailed++;
        log("Failed to process message", {
          messageId: message.MessageId,
          error: err.message,
        });
      }
    }
  } catch (err) {
    log("Error polling queue", { error: err.message });
  }
}

async function startPolling() {
  log("Starting SQS polling", {
    queueUrl: QUEUE_URL,
    region: AWS_REGION,
    pollInterval: POLL_INTERVAL_MS,
    processingTime: PROCESSING_TIME_MS,
  });

  while (true) {
    await pollQueue();
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

// Health check server for k8s probes
const app = express();

app.get("/healthz", (req, res) => {
  res.json({ status: "ok", ...stats });
});

app.get("/readyz", (req, res) => {
  res.json({ status: "ready" });
});

app.listen(HEALTH_PORT, () => {
  log("Health server started", { port: HEALTH_PORT });
});

startPolling();
