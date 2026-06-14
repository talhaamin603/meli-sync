"""Seed categories directly into the SQLite database."""
import sqlite3, os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "meli_sync.db")

CATEGORIES = {
    "Electronics":           ["Smartphones", "Laptops", "Tablets", "Smartwatches", "Portable Chargers"],
    "Computers":             ["Desktops", "Monitors", "Keyboards", "Mice", "USB Hubs"],
    "TV & Home Theater":     ["Smart TVs", "Projectors", "Soundbars", "Streaming Devices", "Remote Controls"],
    "Audio & Music":         ["Bluetooth Speakers", "Earbuds", "Microphones", "Amplifiers", "DJ Equipment"],
    "Gaming":                ["Consoles", "Controllers", "Gaming Chairs", "Gaming Headsets", "Video Games"],
    "Cameras & Photography": ["DSLR Cameras", "Action Cameras", "Camera Lenses", "Tripods", "Memory Cards"],
    "Home Appliances":       ["Blenders", "Coffee Makers", "Air Fryers", "Vacuum Cleaners", "Microwaves"],
    "Smart Home":            ["Smart Bulbs", "Security Cameras", "Smart Speakers", "Smart Plugs", "Thermostats"],
    "Health & Beauty":       ["Skincare", "Hair Care", "Vitamins & Supplements", "Electric Toothbrushes", "Massagers"],
    "Sports & Outdoors":     ["Running Shoes", "Yoga & Pilates", "Bicycles", "Camping Gear", "Fitness Equipment"],
    "Clothing & Apparel":    ["Men's Clothing", "Women's Clothing", "Kids' Clothing", "Footwear", "Accessories"],
    "Books & Media":         ["Fiction", "Non-Fiction", "Educational", "Comics & Manga", "Audiobooks"],
    "Toys & Games":          ["Action Figures", "Board Games", "Building Sets", "Dolls", "Outdoor Toys"],
    "Baby & Kids":           ["Baby Clothing", "Car Seats", "Strollers", "Baby Monitors", "Baby Toys"],
    "Kitchen & Dining":      ["Cookware", "Cutlery", "Food Storage", "Bakeware", "Kitchen Gadgets"],
    "Furniture & Decor":     ["Chairs & Seating", "Tables & Desks", "Shelves & Storage", "Lighting", "Rugs & Curtains"],
    "Tools & Hardware":      ["Power Tools", "Hand Tools", "Measuring Tools", "Safety Equipment", "Tool Storage"],
    "Automotive":            ["Car Electronics", "Car Accessories", "Cleaning & Detailing", "Car Audio", "Dash Cams"],
    "Pet Supplies":          ["Dog Supplies", "Cat Supplies", "Bird Supplies", "Fish & Aquatic", "Small Pet Supplies"],
    "Office & Stationery":   ["Printers & Ink", "Desk Accessories", "Paper Products", "Office Chairs", "Whiteboards"],
}

now = datetime.utcnow().isoformat()

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

added = 0
skipped = 0

for main_name, subs in CATEGORIES.items():
    cur.execute("SELECT id FROM category WHERE name=? AND parent_id IS NULL", (main_name,))
    row = cur.fetchone()
    if row:
        main_id = row[0]
        print(f"  ~ {main_name} already exists (id={main_id})")
        skipped += 1
    else:
        cur.execute("INSERT INTO category (name, parent_id, created_at) VALUES (?, NULL, ?)", (main_name, now))
        main_id = cur.lastrowid
        print(f"  + {main_name} (id={main_id})")
        added += 1

    for sub in subs:
        cur.execute("SELECT id FROM category WHERE name=? AND parent_id=?", (sub, main_id))
        if cur.fetchone():
            print(f"      ~ {sub} already exists")
            skipped += 1
        else:
            cur.execute("INSERT INTO category (name, parent_id, created_at) VALUES (?, ?, ?)", (sub, main_id, now))
            print(f"      + {sub}")
            added += 1

conn.commit()
conn.close()
print(f"\nDone. Added: {added}, Skipped (already existed): {skipped}")
