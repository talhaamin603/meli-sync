"""Database connection and session handling."""
from sqlmodel import SQLModel, create_engine, Session
from app.config import settings

# echo=False keeps the console clean. Set True to see every SQL query.
engine = create_engine(settings.DATABASE_URL, echo=False)


def init_db():
    """Create all tables defined in models.py if they don't exist."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Yields a database session for one request, then closes it."""
    with Session(engine) as session:
        yield session
