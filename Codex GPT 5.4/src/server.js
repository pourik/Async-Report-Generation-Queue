const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const QUEUE_CONCURRENCY = 2;

const jobs = new Map();
const queue = [];
let activeWorkers = 0;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.post("/api/reports", (req, res) => {
  const { reportName, reportType, requestedBy, dateRange } = req.body ?? {};

  if (!reportName || !reportType || !requestedBy || !dateRange) {
    return res.status(400).json({
      error: "reportName, reportType, requestedBy, and dateRange are required."
    });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const job = {
    id,
    reportName,
    reportType,
    requestedBy,
    dateRange,
    status: "queued",
    progress: 0,
    queuePosition: queue.length + 1,
    createdAt: now,
    startedAt: null,
    completedAt: null,
    error: null,
    result: null,
    timeline: [
      {
        at: now,
        message: "Job accepted and added to the queue."
      }
    ]
  };

  jobs.set(id, job);
  queue.push(id);
  runNextJob();

  return res.status(202).json({
    message: "Report queued for asynchronous generation.",
    job: serializeJob(job)
  });
});

app.get("/api/reports", (_req, res) => {
  const allJobs = [...jobs.values()]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(serializeJob);

  res.json({ jobs: allJobs });
});

app.get("/api/reports/:id", (req, res) => {
  const job = jobs.get(req.params.id);

  if (!job) {
    return res.status(404).json({ error: "Job not found." });
  }

  syncQueuePositions();
  return res.json({ job: serializeJob(job) });
});

app.get("/api/reports/:id/download", (req, res) => {
  const job = jobs.get(req.params.id);

  if (!job) {
    return res.status(404).json({ error: "Job not found." });
  }

  if (job.status !== "completed" || !job.result) {
    return res.status(409).json({ error: "Report is not ready yet." });
  }

  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${toFileName(job.reportName)}-${job.id}.json"`
  );

  return res.send(JSON.stringify(job.result, null, 2));
});

app.listen(PORT, () => {
  console.log(`Async report queue demo running at http://localhost:${PORT}`);
});

function runNextJob() {
  syncQueuePositions();

  while (activeWorkers < QUEUE_CONCURRENCY && queue.length > 0) {
    const nextJobId = queue.shift();
    const job = jobs.get(nextJobId);

    if (!job || job.status !== "queued") {
      continue;
    }

    activeWorkers += 1;
    processJob(job)
      .catch((error) => {
        markJobFailed(job, error);
      })
      .finally(() => {
        activeWorkers -= 1;
        syncQueuePositions();
        runNextJob();
      });
  }
}

async function processJob(job) {
  const startedAt = new Date().toISOString();
  job.status = "processing";
  job.startedAt = startedAt;
  job.queuePosition = null;
  pushTimeline(job, "Worker picked up the job.");

  const stages = [
    { progress: 15, label: "Validating request payload", delay: 700 },
    { progress: 35, label: "Collecting source records", delay: 1100 },
    { progress: 60, label: "Aggregating report metrics", delay: 900 },
    { progress: 85, label: "Rendering final report payload", delay: 800 },
    { progress: 100, label: "Persisting generated artifact", delay: 600 }
  ];

  for (const stage of stages) {
    await wait(stage.delay);
    job.progress = stage.progress;
    pushTimeline(job, stage.label);
  }

  const completedAt = new Date().toISOString();
  job.status = "completed";
  job.completedAt = completedAt;
  job.result = buildReportResult(job);
  pushTimeline(job, "Report generated successfully.");
}

function markJobFailed(job, error) {
  job.status = "failed";
  job.error = error instanceof Error ? error.message : String(error);
  job.completedAt = new Date().toISOString();
  pushTimeline(job, `Job failed: ${job.error}`);
}

function serializeJob(job) {
  return {
    id: job.id,
    reportName: job.reportName,
    reportType: job.reportType,
    requestedBy: job.requestedBy,
    dateRange: job.dateRange,
    status: job.status,
    progress: job.progress,
    queuePosition: job.status === "queued" ? job.queuePosition : null,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    error: job.error,
    resultPreview: job.result
      ? {
          summary: job.result.summary,
          rowCount: job.result.rows.length
        }
      : null,
    timeline: job.timeline
  };
}

function syncQueuePositions() {
  queue.forEach((jobId, index) => {
    const queuedJob = jobs.get(jobId);

    if (queuedJob && queuedJob.status === "queued") {
      queuedJob.queuePosition = index + 1;
    }
  });
}

function pushTimeline(job, message) {
  job.timeline.push({
    at: new Date().toISOString(),
    message
  });
}

function buildReportResult(job) {
  const generatedAt = new Date().toISOString();
  const rows = Array.from({ length: 6 }, (_, index) => {
    const units = 40 + index * 7;
    const revenue = units * 24;

    return {
      rowId: index + 1,
      segment: `${job.reportType}-segment-${index + 1}`,
      units,
      revenue,
      conversionRate: Number((0.18 + index * 0.03).toFixed(2))
    };
  });

  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const totalUnits = rows.reduce((sum, row) => sum + row.units, 0);

  return {
    metadata: {
      generatedAt,
      generatedFor: job.requestedBy,
      reportName: job.reportName,
      reportType: job.reportType,
      dateRange: job.dateRange
    },
    summary: {
      totalRows: rows.length,
      totalUnits,
      totalRevenue,
      averageRevenuePerRow: Number((totalRevenue / rows.length).toFixed(2))
    },
    rows
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toFileName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
