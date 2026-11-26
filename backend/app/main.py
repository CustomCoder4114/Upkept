"""Starts FastAPI and connects the routers."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import (accounts, auth, documents, guides, home, items, money, overviews, planner, profiles, reminders, scan,
                         travel)

settings = get_settings()

app = FastAPI(
    title="Upkept API",
    version="0.1.0",
    # The interactive docs stay off in production; the OpenAPI JSON is still generated for the TS client.
    docs_url=None if settings.is_production else "/docs",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth, accounts, profiles, items, home, planner, overviews, documents, scan, reminders, guides, travel, money):
    app.include_router(r.router)


@app.get("/health", tags=["system"])
def health():
    return {"ok": True}
