from sqlmodel import Session
from app.database import engine, init_db

print("Creating tables...")
init_db()
print("SUCCESS - database connected and tables created!")

with Session(engine) as s:
    print("Session works.")
