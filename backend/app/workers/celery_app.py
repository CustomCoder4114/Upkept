"""Celery worker + beat (the scheduler). Beat is what makes "every 5 minutes" happen."""
from celery import Celery
from celery.schedules import crontab

from app.config import get_settings

celery = Celery("upkept", broker=get_settings().redis_url, include=["app.workers.tasks"])
celery.conf.update(
    timezone="UTC",
    task_acks_late=True,  # if a worker dies mid-task, the task runs again (safe: deliveries are unique)
    worker_prefetch_multiplier=1,
    beat_schedule={
        "send-due-reminders": {"task": "app.workers.tasks.send_due_reminders", "schedule": 300.0},
        "escalate-ignored-reminders": {"task": "app.workers.tasks.escalate_ignored",
                                       "schedule": crontab(minute=15, hour="*/6")},
        "weekly-due-soon-summary": {"task": "app.workers.tasks.weekly_summary",
                                    "schedule": crontab(minute=0, hour=5, day_of_week="mon")},
    },
)
