# Async Report Generation Queue Demo

This is a complete, working demonstration of an asynchronous task queue architecture commonly used for long-running processes like report generation, video encoding, or bulk email sending.

## Tech Stack
* **Web API**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
* **Task Queue / Worker**: [Celery](https://docs.celeryq.dev/en/stable/) (Python)
* **Message Broker & Result Backend**: [Redis](https://redis.io/) (via Docker)

## How to Run

1. **Start Redis (Message Broker)**
   Open a terminal in this directory and run:
   ```bash
   docker-compose up -d
   ```

2. **Install Dependencies**
   (It's recommended to use a virtual environment)
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the Celery Worker Process**
   Open a **new** terminal in this directory and start the Celery worker:
   ```bash
   # On Windows:
   celery -A tasks worker --loglevel=info --pool=solo
   
   # On Linux/macOS:
   celery -A tasks worker --loglevel=info
   ```

4. **Start the FastAPI Web Server**
   Open **another new** terminal in this directory and start the API:
   ```bash
   uvicorn main:app --reload
   ```

## How to Test

1. **Trigger a Report Generation**
   In another terminal (or using an API client like Postman or the Swagger UI at `http://127.0.0.1:8000/docs`), send a POST request:
   ```bash
   curl -X POST http://127.0.0.1:8000/api/reports/generate
   ```
   *Response:*
   ```json
   {
       "message": "Report generation started",
       "task_id": "b1b81e4b-9c42-4f9e-a8f8-8bb092cc6fb9",
       "status_url": "/api/reports/b1b81e4b-9c42-4f9e-a8f8-8bb092cc6fb9/status"
   }
   ```
   *(Notice how the API returns instantly, but looking at your Celery terminal, you'll see the worker has picked up the job and is processing it).*

2. **Check the Status**
   Use the `task_id` from the previous step to check the status.
   ```bash
   curl http://127.0.0.1:8000/api/reports/{YOUR_TASK_ID}/status
   ```
   *Response (If checked within 10 seconds):*
   ```json
   {
       "task_id": "b1b81e4b-9c42-4f9e-a8f8-8bb092cc6fb9",
       "status": "PENDING"
   }
   ```

3. **Get the Results**
   Wait 10 seconds and check the status again:
   ```bash
   curl http://127.0.0.1:8000/api/reports/{YOUR_TASK_ID}/status
   ```
   *Response (After completion):*
   ```json
   {
       "task_id": "b1b81e4b-9c42-4f9e-a8f8-8bb092cc6fb9",
       "status": "SUCCESS",
       "result": {
           "report_id": "REP-8324",
           "title": "Monthly Sales Report",
           "total_revenue": "$1,234,567",
           "status": "completed",
           "download_url": "https://example.com/reports/download/b1b81e4b-9c42-4f9e-a8f8-8bb092cc6fb9.pdf"
       }
   }
   ```
