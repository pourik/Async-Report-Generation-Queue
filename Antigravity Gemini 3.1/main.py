from fastapi import FastAPI
from celery.result import AsyncResult
from tasks import generate_report_task, celery_app

app = FastAPI(
    title="Async Report Generation API",
    description="A demo API showing how to use FastAPI with Celery and Redis to handle long-running background tasks."
)

@app.post("/api/reports/generate")
async def generate_report():
    """
    Endpoint to trigger a long-running report generation task.
    Instead of waiting for the report to be generated, it quickly delegates the work to Celery
    and returns a task_id to the client.
    """
    # Dispatch the task to the Celery worker
    task = generate_report_task.delay()
    
    return {
        "message": "Report generation started", 
        "task_id": task.id,
        "status_url": f"/api/reports/{task.id}/status"
    }

@app.get("/api/reports/{task_id}/status")
async def get_report_status(task_id: str):
    """
    Endpoint for the client to poll the status of their report generation task.
    """
    # Fetch the task result from the Redis backend
    task_result = AsyncResult(task_id, app=celery_app)
    
    response = {
        "task_id": task_id,
        "status": task_result.status,
    }
    
    if task_result.status == 'SUCCESS':
        # Result contains the return value of generate_report_task
        response["result"] = task_result.result 
    elif task_result.status == 'FAILURE':
        response["error"] = str(task_result.info)
        
    return response
