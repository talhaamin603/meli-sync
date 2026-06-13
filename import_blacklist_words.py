"""
One-time script: imports words from an uploaded blacklist file into the DB.
The file uses the check mark character (U+2713) as a separator and contains
"NEW" marker lines that must be skipped.

Every imported term is stored as rule_type="keyword".
Safe to re-run: terms already in the database are skipped.

Usage:  python import_blacklist_words.py "C:\\path\\to\\black list.txt"
"""
import sys
import re
from sqlmodel import Session, select
from app.database import engine, init_db
from app.models import BlacklistRule


def parse_terms(path: str) -> list[str]:
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()

    # words are separated by U+2713 check marks and/or newlines
    tokens = re.split(r"[✓\r\n]+", raw)

    seen = set()
    terms = []
    for token in tokens:
        term = token.strip().lower()
        if not term or term == "new":
            continue
        if term in seen:
            continue
        seen.add(term)
        terms.append(term)
    return terms


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "black list.txt"
    terms = parse_terms(path)
    print(f"Parsed {len(terms)} unique terms from file.")

    init_db()
    with Session(engine) as session:
        existing = {
            r.value.strip().lower()
            for r in session.exec(select(BlacklistRule)).all()
        }
        print(f"Database currently has {len(existing)} terms.")

        added = 0
        for term in terms:
            if term in existing:
                continue
            session.add(BlacklistRule(rule_type="keyword", value=term))
            existing.add(term)
            added += 1
        session.commit()
        print(f"Added {added} new keyword terms. Skipped {len(terms) - added} already present.")


if __name__ == "__main__":
    main()
