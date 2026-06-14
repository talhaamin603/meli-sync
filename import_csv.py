"""
import_csv.py
Loads products from a CSV file into the database.

This REPLACES the Amazon API for getting products in.
Run it whenever you have a filled-in CSV of products.

USAGE:
    python import_csv.py products.csv

WHAT IT DOES:
  1. Reads each row of the CSV
  2. Checks required fields are present
  3. Runs each product through the blacklist filter
  4. Skips products that are not Prime (client wants Prime only)
  5. Inserts valid products into the database
  6. Prints a clear summary report

It is SAFE to run more than once - products already in the database
(matched by ASIN) are skipped, not duplicated.
"""
import csv
import sys
from datetime import datetime
from sqlmodel import Session, select
from app.database import engine, init_db
from app.models import Product, AuditLog
from app.services.blacklist import BlacklistFilter


REQUIRED_COLUMNS = [
    "asin", "title", "description", "image_url",
    "amazon_price_usd", "stock", "is_prime",
]


def parse_bool(value: str) -> bool:
    """Turn text like 'true', 'yes', '1' into a real boolean."""
    return str(value).strip().lower() in ("true", "yes", "1", "y")


def parse_float(value: str, field: str, row_num: int) -> float:
    """Turn text into a number, with a clear error if it fails."""
    cleaned = str(value).replace("$", "").replace(",", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        raise ValueError(
            f"Row {row_num}: '{field}' is not a valid number: '{value}'"
        )


def main():
    # --- get the CSV filename from the command line ---
    if len(sys.argv) < 2:
        print("ERROR: please provide the CSV filename.")
        print("Usage: python import_csv.py products.csv")
        return

    csv_path = sys.argv[1]
    init_db()

    # --- load the blacklist filter ---
    blacklist = BlacklistFilter()
    with Session(engine) as session:
        blacklist.load_from_db(session)

    # --- read the CSV file ---
    try:
        with open(csv_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            columns = reader.fieldnames or []
    except FileNotFoundError:
        print(f"ERROR: file not found: {csv_path}")
        return

    # --- check the CSV has the right columns ---
    missing = [c for c in REQUIRED_COLUMNS if c not in columns]
    if missing:
        print(f"ERROR: CSV is missing columns: {missing}")
        print(f"Required columns: {REQUIRED_COLUMNS}")
        return

    print(f"Read {len(rows)} rows from {csv_path}")
    print("-" * 55)

    # --- counters for the final report ---
    added = 0
    skipped_duplicate = 0
    skipped_not_prime = 0
    skipped_blocked = 0
    errors = 0

    with Session(engine) as session:
        # get all ASINs already in the database
        existing_asins = set(
            p.asin for p in session.exec(select(Product)).all()
        )

        for i, row in enumerate(rows, start=2):  # row 2 = first data row
            try:
                asin = row["asin"].strip()
                title = row["title"].strip()

                # --- basic validation ---
                if not asin or not title:
                    print(f"Row {i}: SKIPPED - missing asin or title")
                    errors += 1
                    continue

                # --- duplicate check ---
                if asin in existing_asins:
                    skipped_duplicate += 1
                    continue

                # --- Prime check (client wants Prime only) ---
                is_prime = parse_bool(row["is_prime"])
                if not is_prime:
                    print(f"Row {i}: SKIPPED - not Prime: {title[:40]}")
                    skipped_not_prime += 1
                    continue

                # --- blacklist check ---
                result = blacklist.check(title)
                if result["blocked"]:
                    print(f"Row {i}: BLOCKED - {title[:40]}")
                    print(f"         {result['reason']}")
                    skipped_blocked += 1
                    # still record it, marked as blocked, for transparency
                    product = Product(
                        asin=asin,
                        title=title,
                        description=row["description"].strip(),
                        image_url=row["image_url"].strip(),
                        amazon_price_usd=parse_float(
                            row["amazon_price_usd"], "amazon_price_usd", i
                        ),
                        stock=int(float(row["stock"] or 0)),
                        is_prime=is_prime,
                        status="blocked",
                        block_reason=result["reason"],
                    )
                    session.add(product)
                    existing_asins.add(asin)
                    continue

                # --- all checks passed - add the product ---
                product = Product(
                    asin=asin,
                    title=title,
                    description=row["description"].strip(),
                    image_url=row["image_url"].strip(),
                    amazon_price_usd=parse_float(
                        row["amazon_price_usd"], "amazon_price_usd", i
                    ),
                    stock=int(float(row["stock"] or 0)),
                    is_prime=is_prime,
                    status="pending",  # ready to be published in Module 2
                )
                session.add(product)
                session.add(AuditLog(
                    action="manual_import",
                    asin=asin,
                    detail=f"Imported from CSV: {title[:50]}",
                ))
                existing_asins.add(asin)
                added += 1

            except ValueError as e:
                print(f"Row {i}: ERROR - {e}")
                errors += 1
            except Exception as e:
                print(f"Row {i}: UNEXPECTED ERROR - {e}")
                errors += 1

        session.commit()

    # --- print the final report ---
    print("-" * 55)
    print("CSV IMPORT COMPLETE")
    print("-" * 55)
    print(f"Total rows in file       : {len(rows)}")
    print(f"Added (ready to publish) : {added}")
    print(f"Blocked by blacklist     : {skipped_blocked}")
    print(f"Skipped (not Prime)      : {skipped_not_prime}")
    print(f"Skipped (already in DB)  : {skipped_duplicate}")
    print(f"Errors (bad data)        : {errors}")
    print("-" * 55)


if __name__ == "__main__":
    main()
