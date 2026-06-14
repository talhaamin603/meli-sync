"""
Blacklist Filter.
Loads all blacklist terms and checks product titles against them
using fast, whole-word matching (not substring matching).
"""
import unicodedata
import ahocorasick
from sqlmodel import Session, select
from app.models import BlacklistRule


def normalize_text(text: str) -> str:
    """
    Lowercase, remove accents, collapse spaces.
    Both blacklist terms and product titles go through this so matching
    is consistent. Example: 'Cañamo' -> 'canamo'
    """
    if not text:
        return ""
    text = text.lower().strip()
    # remove accents (á -> a, ñ -> n)
    text = "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )
    # collapse multiple spaces into one
    text = " ".join(text.split())
    return text


class BlacklistFilter:
    """
    Build this once at startup, then call .check() for every product.
    """
    def __init__(self):
        self.automaton = ahocorasick.Automaton()
        self.term_count = 0

    def load_from_db(self, session: Session):
        """Load every blacklist term from the database into memory."""
        rules = session.exec(select(BlacklistRule)).all()
        for rule in rules:
            term = normalize_text(rule.value)
            if term:
                # store the original value so we can report what matched
                self.automaton.add_word(term, (term, rule.value))
        self.automaton.make_automaton()
        self.term_count = len(rules)
        print(f"Blacklist loaded: {self.term_count} terms")

    def check(self, title: str) -> dict:
        """
        Check one product title.
        Returns {"blocked": True/False, "reason": "..."}.
        Uses whole-word matching: the term 'cat' will NOT match inside
        'education' - only the standalone word 'cat'.
        """
        if self.term_count == 0:
            return {"blocked": False, "reason": None, "term": None}

        clean = normalize_text(title)
        if not clean:
            return {"blocked": False, "reason": None, "term": None}

        # pad with spaces so word-boundary check works at start/end
        padded = f" {clean} "

        for end_index, (term, original) in self.automaton.iter(padded):
            start_index = end_index - len(term) + 1
            # characters immediately before and after the match
            before = padded[start_index - 1]
            after = padded[end_index + 1]
            # it's a real word match only if surrounded by space/boundary
            if not before.isalnum() and not after.isalnum():
                return {
                    "blocked": True,
                    "reason": f"matched blacklisted term: '{original}'",
                    "term": original,
                }
        return {"blocked": False, "reason": None, "term": None}

    def check_product(self, title: str, description: str = "") -> dict:
        """
        Check a product's title AND description.
        Returns the first match found, title checked first.
        """
        result = self.check(title)
        if result["blocked"]:
            return result
        return self.check(description or "")