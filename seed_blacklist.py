"""
One-time script: loads blacklist_seed.txt into the database.
Run this ONCE after the database tables are created.
Running it again will skip terms that already exist (safe to re-run).
"""
from sqlmodel import Session, select
from app.database import engine, init_db
from app.models import BlacklistRule


def looks_like_keyword(term: str) -> bool:
    """
    Rough guess: Spanish category words are 'keyword', brands are 'brand'.
    This is just a label for the dashboard - not critical to matching.
    """
    spanish_hints = [
        "arma", "bala", "aborto", "cigarr", "alcohol", "bebida",
        "antibiotico", "analgesico", "droga", "cannabis", "casino",
        "apuesta", "billete", "clonar", "crema", "acido", "pastilla",
    ]
    low = term.lower()
    return any(hint in low for hint in spanish_hints)


def main():
    init_db()  # make sure tables exist
    with open("blacklist_seed.txt", "r", encoding="utf-8") as f:
        terms = [line.strip() for line in f if line.strip()]

    print(f"Read {len(terms)} terms from file.")

    with Session(engine) as session:
        existing = set(
            r.value for r in session.exec(select(BlacklistRule)).all()
        )
        added = 0
        for term in terms:
            if term in existing:
                continue
            rule_type = "keyword" if looks_like_keyword(term) else "brand"
            session.add(BlacklistRule(rule_type=rule_type, value=term))
            added += 1
        session.commit()
        print(f"Added {added} new terms. Skipped {len(terms) - added}.")


if __name__ == "__main__":
    main()