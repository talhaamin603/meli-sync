"""FastAPI application entry point."""
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, migrate_db
from app.routers import manual_products
from app.routers import meli
from app.routers import amazon as amazon_router
from app.routers import sync as sync_router
# from app.routers import auth as auth_router   # ← disabled locally (router not yet created)

app = FastAPI(title="Meli Sync - Module 1 & 2")

# ============================================================
# CORS - Allow React frontend to call this backend
# ============================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",           # React dev server
        "http://localhost:5174",           # React dev server (fallback port)
        "http://localhost:3000",           # Alternative dev port
        "https://*.railway.app",           # Railway frontend
        "http://melizone.tech",            # Production domain
        "https://melizone.tech",           # Production domain HTTPS
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Include routers
# ============================================================
app.include_router(manual_products.router)
app.include_router(meli.router)
app.include_router(amazon_router.router)
app.include_router(sync_router.router)
# app.include_router(auth_router.router)        # ← disabled locally

# ============================================================
# Startup event
# ============================================================
@app.on_event("startup")
def on_startup():
    init_db()
    migrate_db()
    print("Database tables ready.")
    print("Module 1 & 2 routers loaded.")
    # print("Auth router loaded.")

# ============================================================
# Health endpoints
# ============================================================
@app.get("/")
def root():
    return {
        "status": "ok",
        "module": 1,
        "message": "Meli Sync API running"
    }

@app.get("/health")
def health():
    return {"healthy": True}


# ============================================================
# For testing only - list all routes
# ============================================================
@app.get("/routes")
def list_routes():
    """Utility endpoint to see all registered routes"""
    routes = []
    for route in app.routes:
        routes.append({
            "path": route.path,
            "methods": list(route.methods) if hasattr(route, "methods") else []
        })
    return {"routes": routes}