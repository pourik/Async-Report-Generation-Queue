# Async Report Generation Queue Demo

This is a small end-to-end demo that shows how to queue report-generation jobs and process them asynchronously in the background.

## What it includes

- `POST /api/reports` to enqueue a report request
- `GET /api/reports` to list all jobs
- `GET /api/reports/:id` to fetch a single job status
- `GET /api/reports/:id/download` to download the generated report once complete
- A background worker with queue concurrency set to `2`
- A static frontend that submits jobs and polls for updates

## Run it

```bash
npm install
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

## Example API request

```bash
curl -X POST http://localhost:3000/api/reports ^
  -H "Content-Type: application/json" ^
  -d "{\"reportName\":\"Monthly Revenue\",\"reportType\":\"sales\",\"requestedBy\":\"ops@example.com\",\"dateRange\":\"2026-02-01 to 2026-02-28\"}"
```
