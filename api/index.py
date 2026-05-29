from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import init_db
from app.routers import manual_products

app = FastAPI(title="Meli Sync API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(manual_products.router)

@app.get("/api/health")
def health():
    return {"healthy": True}

@app.get("/")
def root():
    return {"status": "ok", "module": 1, "message": "Meli Sync API running"}

# Vercel handler
handler = app