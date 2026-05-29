"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routes import products, blacklist, settings

app = FastAPI(title="Meli Sync - Module 1")

# Allow the frontend (any origin in dev; tighten in production) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router, prefix="/api")
app.include_router(blacklist.router, prefix="/api")
app.include_router(settings.router, prefix="/api")


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