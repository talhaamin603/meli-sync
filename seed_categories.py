"""Seed 20 main categories with 5 subcategories each."""
import requests

BASE = "http://localhost:8000/api/categories"

CATEGORIES = {
    "Electronics":          ["Smartphones", "Laptops", "Tablets", "Smartwatches", "Portable Chargers"],
    "Computers":            ["Desktops", "Monitors", "Keyboards", "Mice", "USB Hubs"],
    "TV & Home Theater":    ["Smart TVs", "Projectors", "Soundbars", "Streaming Devices", "Remote Controls"],
    "Audio & Music":        ["Bluetooth Speakers", "Earbuds", "Microphones", "Amplifiers", "DJ Equipment"],
    "Gaming":               ["Consoles", "Controllers", "Gaming Chairs", "Gaming Headsets", "Video Games"],
    "Cameras & Photography":["DSLR Cameras", "Action Cameras", "Camera Lenses", "Tripods", "Memory Cards"],
    "Home Appliances":      ["Blenders", "Coffee Makers", "Air Fryers", "Vacuum Cleaners", "Microwaves"],
    "Smart Home":           ["Smart Bulbs", "Security Cameras", "Smart Speakers", "Smart Plugs", "Thermostats"],
    "Health & Beauty":      ["Skincare", "Hair Care", "Vitamins & Supplements", "Electric Toothbrushes", "Massagers"],
    "Sports & Outdoors":    ["Running Shoes", "Yoga & Pilates", "Bicycles", "Camping Gear", "Fitness Equipment"],
    "Clothing & Apparel":   ["Men's Clothing", "Women's Clothing", "Kids' Clothing", "Footwear", "Accessories"],
    "Books & Media":        ["Fiction", "Non-Fiction", "Educational", "Comics & Manga", "Audiobooks"],
    "Toys & Games":         ["Action Figures", "Board Games", "Building Sets", "Dolls", "Outdoor Toys"],
    "Baby & Kids":          ["Baby Clothing", "Car Seats", "Strollers", "Baby Monitors", "Baby Toys"],
    "Kitchen & Dining":     ["Cookware", "Cutlery", "Food Storage", "Bakeware", "Kitchen Gadgets"],
    "Furniture & Decor":    ["Chairs & Seating", "Tables & Desks", "Shelves & Storage", "Lighting", "Rugs & Curtains"],
    "Tools & Hardware":     ["Power Tools", "Hand Tools", "Measuring Tools", "Safety Equipment", "Tool Storage"],
    "Automotive":           ["Car Electronics", "Car Accessories", "Cleaning & Detailing", "Car Audio", "Dash Cams"],
    "Pet Supplies":         ["Dog Supplies", "Cat Supplies", "Bird Supplies", "Fish & Aquatic", "Small Pet Supplies"],
    "Office & Stationery":  ["Printers & Ink", "Desk Accessories", "Paper Products", "Office Chairs", "Whiteboards"],
}

added = 0
skipped = 0

for main_name, subs in CATEGORIES.items():
    # Add main category
    r = requests.post(BASE, json={"name": main_name, "parent_id": None})
    if r.status_code == 200:
        main_id = r.json()["id"]
        print(f"  + {main_name} (id={main_id})")
        added += 1
    elif r.status_code == 400 and "already exists" in r.text:
        # Already there — look up its id
        all_cats = requests.get(BASE).json()
        match = next((c for c in all_cats if c["name"] == main_name and c["parent_id"] is None), None)
        if match:
            main_id = match["id"]
            print(f"  ~ {main_name} already exists (id={main_id})")
            skipped += 1
        else:
            print(f"  ! Could not find id for {main_name}, skipping subs")
            continue
    else:
        print(f"  ! Failed to add {main_name}: {r.status_code} {r.text}")
        continue

    # Add subcategories
    for sub in subs:
        rs = requests.post(BASE, json={"name": sub, "parent_id": main_id})
        if rs.status_code == 200:
            print(f"      + {sub}")
            added += 1
        elif rs.status_code == 400 and "already exists" in rs.text:
            print(f"      ~ {sub} already exists")
            skipped += 1
        else:
            print(f"      ! Failed: {sub}: {rs.status_code} {rs.text}")

print(f"\nDone. Added: {added}, Skipped (already existed): {skipped}")
