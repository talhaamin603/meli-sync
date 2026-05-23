"""FastAPI application entry point."""
from fastapi import FastAPI
from app.database import init_db

app = FastAPI(title="Meli Sync - Module 1")


@app.on_event("startup")
def on_startup():
    init_db()
    print("Database tables ready.")


@app.get("/")
def root():
    return {"status": "ok", "module": 1, "message": "Meli Sync API running"}


@app.get("/health")
def health():
    return {"healthy": True}