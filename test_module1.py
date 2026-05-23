"""
Module 1 demo script.
Fetches real Amazon products, applies the Prime filter and the blacklist
filter, and prints a clear report.
"""
from sqlmodel import Session
from app.database import engine, init_db
from app.services.amazon import AmazonReader
from app.services.blacklist import BlacklistFilter

# Search terms to pull a realistic mix of products.
SEARCH_TERMS = ["phone tripod", "kitchen gadget", "laptop stand"]


def main():
    init_db()

    # 1. Load the blacklist
    blacklist = BlacklistFilter()
    with Session(engine) as session:
        blacklist.load_from_db(session)

    # 2. Fetch products from Amazon
    reader = AmazonReader()
    all_products = []
    for term in SEARCH_TERMS:
        print(f"\nSearching Amazon for: {term}")
        results = reader.search_products(term, page=1)
        print(f"  got {len(results)} products")
        all_products.extend(results)

    print(f"\nTotal fetched: {len(all_products)}")

    # 3. Apply filters
    passed, blocked, not_prime = [], [], []
    for p in all_products:
        if not p["is_prime"]:
            not_prime.append(p)
            continue
        result = blacklist.check(p["title"])
        if result["blocked"]:
            blocked.append((p, result["reason"]))
        else:
            passed.append(p)

    # 4. Print the report
    print("\n" + "=" * 55)
    print("MODULE 1 RESULTS")
    print("=" * 55)
    print(f"Fetched from Amazon : {len(all_products)}")
    print(f"Skipped (not Prime) : {len(not_prime)}")
    print(f"Blocked (blacklist) : {len(blocked)}")
    print(f"PASSED (ready)      : {len(passed)}")
    print("=" * 55)

    print("\n--- Sample BLOCKED products ---")
    for p, reason in blocked[:10]:
        print(f"  [{p['asin']}] {p['title'][:50]}")
        print(f"      -> {reason}")

    print("\n--- Sample PASSED products ---")
    for p in passed[:10]:
        print(f"  [{p['asin']}] {p['title'][:50]}")
        print(f"      ${p['price_usd']}  Prime={p['is_prime']}")


if __name__ == "__main__":
    main()