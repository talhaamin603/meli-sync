"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import manual_products
from app.routers import meli

app = FastAPI(title="Meli Sync - Module 1 & 2")

# ============================================================
# CORS - Allow React frontend to call this backend
# ============================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",           # React dev server
        "http://localhost:3000",           # Alternative dev port
        "https://*.railway.app",           # Railway frontend
        "https://*.netlify.app",           # Netlify frontend
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

# ============================================================
# Startup event
# ============================================================
@app.on_event("startup")
def on_startup():
    init_db()
    print("✅ Database tables ready.")
    print("✅ Module 1 & 2 routers loaded.")

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