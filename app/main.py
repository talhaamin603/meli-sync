"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import manual_products

app = FastAPI(title="Meli Sync - Module 1")

# ============================================================
# CORS - Allow React frontend to call this backend
# ============================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Include routers
# ============================================================
app.include_router(manual_products.router)

# ============================================================
# Startup event
# ============================================================
@app.on_event("startup")
def on_startup():
    init_db()
    print("Database tables ready.")

# ============================================================
# Health endpoints
# ============================================================
@app.get("/")
def root():
    return {"status": "ok", "module": 1, "message": "Meli Sync API running"}

@app.get("/health")
def health():
    return {"healthy": True}