FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /srv

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ /srv/
COPY content/ /content/
ENV CONTENT_DIR=/content

RUN useradd --create-home upkept && mkdir -p /data/files && chown -R upkept /data
USER upkept

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
