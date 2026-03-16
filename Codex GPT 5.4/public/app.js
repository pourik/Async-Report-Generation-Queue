const form = document.querySelector("#report-form");
const formMessage = document.querySelector("#form-message");
const jobsContainer = document.querySelector("#jobs");
const refreshButton = document.querySelector("#refresh-button");
const template = document.querySelector("#job-template");

let pollTimer = null;

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formMessage.textContent = "Submitting report job...";

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  try {
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to queue the report.");
    }

    formMessage.textContent = `Queued job ${data.job.id}.`;
    await loadJobs();
    startPolling();
  } catch (error) {
    formMessage.textContent = error.message;
  }
});

refreshButton.addEventListener("click", () => {
  loadJobs();
});

loadJobs().then(startPolling);

async function loadJobs() {
  const response = await fetch("/api/reports");
  const data = await response.json();
  renderJobs(data.jobs);
}

function renderJobs(jobs) {
  jobsContainer.innerHTML = "";

  if (!jobs.length) {
    jobsContainer.innerHTML = '<p class="empty-state">No jobs yet. Queue one above.</p>';
    return;
  }

  jobs.forEach((job) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const status = node.querySelector(".job-status");
    const progressBar = node.querySelector(".progress-bar");
    const detail = node.querySelector(".job-detail");
    const preview = node.querySelector(".job-preview");
    const downloadLink = node.querySelector(".download-link");
    const timeline = node.querySelector(".timeline");

    node.querySelector(".job-title").textContent = job.reportName;
    node.querySelector(".job-meta").textContent =
      `${job.reportType} • requested by ${job.requestedBy} • ${formatDate(job.createdAt)}`;
    status.textContent = job.status;
    status.classList.add(`status-${job.status}`);
    progressBar.style.width = `${job.progress}%`;

    if (job.status === "queued") {
      detail.textContent = `Waiting in queue. Position ${job.queuePosition}.`;
    } else if (job.status === "processing") {
      detail.textContent = `Processing in background. Progress ${job.progress}%.`;
    } else if (job.status === "completed") {
      detail.textContent = `Completed at ${formatDate(job.completedAt)}.`;
    } else {
      detail.textContent = job.error || "The job failed.";
    }

    if (job.resultPreview) {
      preview.textContent = JSON.stringify(job.resultPreview, null, 2);
      downloadLink.href = `/api/reports/${job.id}/download`;
      downloadLink.textContent = "Download generated report";
      downloadLink.hidden = false;
    } else {
      preview.textContent = JSON.stringify(
        {
          progress: job.progress,
          timelineEvents: job.timeline.length
        },
        null,
        2
      );
      downloadLink.hidden = true;
    }

    timeline.innerHTML = job.timeline
      .slice(-4)
      .reverse()
      .map((item) => `<li>${formatDate(item.at)}: ${item.message}</li>`)
      .join("");

    jobsContainer.appendChild(node);
  });
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(async () => {
    try {
      await loadJobs();
    } catch (_error) {
      stopPolling();
      formMessage.textContent = "Polling stopped because the server is unavailable.";
    }
  }, 2000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function formatDate(value) {
  return new Date(value).toLocaleString();
}
