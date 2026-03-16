from celery import Celery
import time
import random

# Configure Celery to use Redis as the broker and result backend.
# The URL format is: redis://[password@]host:port/db
celery_app = Celery(
    "report_tasks",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

@celery_app.task(bind=True)
def generate_report_task(self):
    """
    A Celery task that simulates a long-running report generation process.
    """
    print(f"Starting report generation for task {self.request.id}...")
    
    # Simulate a long-running task (e.g., querying a database, generating a PDF)
    # This will block the worker for 10 seconds, but the API will respond immediately.
    time.sleep(10)
    
    # Simulate the result of the report generation
    report_data = {
        "report_id": f"REP-{random.randint(1000, 9999)}",
        "title": "Monthly Sales Report",
        "total_revenue": "$1,234,567",
        "status": "completed",
        "download_url": f"https://example.com/reports/download/{self.request.id}.pdf"
    }
    
    print(f"Report generation complete for task {self.request.id}!")
    
    # The return value is stored in the Redis result backend,
    # and can be fetched by the API using the task_id.
    return report_data
