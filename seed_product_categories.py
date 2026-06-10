"""Assign category_id to all products based on title keyword matching."""
import sqlite3, re

DB = "meli_sync.db"
conn = sqlite3.connect(DB)
cur = conn.cursor()

# Build lookup: (subcategory_name, parent_name) -> subcategory_id
cur.execute("""
    SELECT c.id, c.name, p.name
    FROM category c
    LEFT JOIN category p ON c.parent_id = p.id
    WHERE c.parent_id IS NOT NULL
""")
sub_map = {}   # (sub_name_lower, parent_name_lower) -> id
for sid, sname, pname in cur.fetchall():
    sub_map[(sname.lower(), pname.lower())] = sid

cur.execute("SELECT id, name FROM category WHERE parent_id IS NULL")
main_map = {name.lower(): mid for mid, name in cur.fetchall()}

def cat_id(sub, parent):
    return sub_map.get((sub.lower(), parent.lower()))

# Title -> (subcategory, parent_category)  rules (checked top-to-bottom, first match wins)
RULES = [
    # --- Pet supplies (must come BEFORE hair care to catch pet shampoos) ---
    (r"douxo|earthbath|tropiclean|pet shampoo|dog shampoo|cat shampoo|puppy shampoo",
     "Dog Supplies", "Pet Supplies"),

    # --- Baby ---
    (r"\bbaby\b|\binfant\b|\bnewborn\b|\bkid shampoo\b|tear.?free.*child|aveeno baby|honest company.*baby",
     "Baby Clothing", "Baby & Kids"),

    # --- Skincare ---
    (r"serum|niacinamide|collagen|retinol|vitamin c.*skin|moisturiz.*face|face wash|face cream|"
     r"watermelon.*glow|glow recipe|skin.*hydrat|toner|eye cream|sunscreen|spf.*face|cerave.*face|"
     r"lash extension|eyelash|mascara|cologne|perfume|fragrance|old spice|aftershave",
     "Skincare", "Health & Beauty"),

    # --- Hair Care ---
    (r"shampoo|conditioner|hair.*growth|hair.*loss|hair.*thicken|hair.*strengthen|"
     r"hair.*oil|hair.*serum|hair.*mask|hair.*treatment|hair.*bundle|scalp|dandruff|"
     r"keratin|biotin.*hair|rice water.*hair|dry shampoo|toning shampoo|blonde.*shampoo|"
     r"moroccan oil|olaplex|ouai|oribe|paul mitchell|tea tree.*hair|pura dor|"
     r"herbal essences|head.{0,3}shoulders|pantene|dove.*shampoo|dove.*conditioner|"
     r"tresemme|loreal.*shampoo|loreal.*conditioner|native.*shampoo|native.*conditioner|"
     r"marc anthony|john frieda",
     "Hair Care", "Health & Beauty"),

    # --- Vitamins / supplements ---
    (r"vitamin|supplement|probiotic|omega|protein powder|collagen.*powder|"
     r"multivitamin|zinc|magnesium|melatonin",
     "Vitamins & Supplements", "Health & Beauty"),

    # --- Electric Toothbrushes ---
    (r"electric toothbrush|oral.?b|sonicare|toothbrush|water flosser|floss",
     "Electric Toothbrushes", "Health & Beauty"),

    # --- Massagers ---
    (r"massager|massage gun|foam roller|percussion|back massager|neck massager",
     "Massagers", "Health & Beauty"),

    # --- Fitness Equipment ---
    (r"dumbbell|weight plate|barbell|kettlebell|resistance band|pull.up bar|"
     r"yoga mat|exercise bike|treadmill|rowing machine|bench press|squat rack|"
     r"gym|workout|fitness",
     "Fitness Equipment", "Sports & Outdoors"),

    # --- Yoga & Pilates ---
    (r"yoga|pilates|meditation mat|stretch band",
     "Yoga & Pilates", "Sports & Outdoors"),

    # --- Running Shoes ---
    (r"running shoe|sneaker|athletic shoe|trail shoe",
     "Running Shoes", "Sports & Outdoors"),

    # --- Bicycles ---
    (r"bicycle|bike|cycling|mountain bike|road bike",
     "Bicycles", "Sports & Outdoors"),

    # --- Camping Gear ---
    (r"camping|tent|sleeping bag|hiking|backpack.*outdoor|fishing|upf.*shirt|"
     r"sun protection.*shirt|outdoor.*shirt",
     "Camping Gear", "Sports & Outdoors"),

    # --- Men's Clothing ---
    (r"men.s.*shirt|dress shirt.*men|men.*dress shirt|men.*polo|men.*jacket|"
     r"men.*pants|men.*shorts|men.*suit|men.*hoodie|men.*sweater",
     "Men's Clothing", "Clothing & Apparel"),

    # --- Women's Clothing ---
    (r"women.s.*dress|women.*blouse|women.*skirt|women.*legging|women.*top|"
     r"ladies.*clothing",
     "Women's Clothing", "Clothing & Apparel"),

    # --- Kids' Clothing ---
    (r"kids.*clothing|children.*clothes|boys.*shirt|girls.*dress",
     "Kids' Clothing", "Clothing & Apparel"),

    # --- Footwear ---
    (r"\bshoe\b|\bboots?\b|\bsandal\b|\bslipper\b|\bheels?\b",
     "Footwear", "Clothing & Apparel"),

    # --- Accessories ---
    (r"\bwatch\b|\brolex\b|\bsunglasses\b|\bbelt\b|\bwallet\b|\bhandbag\b|\bpurse\b",
     "Accessories", "Clothing & Apparel"),

    # --- Smartphones ---
    (r"iphone|samsung.*galaxy|pixel phone|smartphone|android phone",
     "Smartphones", "Electronics"),

    # --- Laptops ---
    (r"laptop|macbook|notebook computer|chromebook",
     "Laptops", "Electronics"),

    # --- Tablets ---
    (r"\bipad\b|\btablet\b|kindle fire",
     "Tablets", "Electronics"),

    # --- Smartwatches ---
    (r"smartwatch|apple watch|fitbit|garmin.*watch|samsung.*watch",
     "Smartwatches", "Electronics"),

    # --- Earbuds ---
    (r"airpods|earbuds|earphones|in.ear|wireless.*ear",
     "Earbuds", "Audio & Music"),

    # --- Bluetooth Speakers ---
    (r"bluetooth.*speaker|portable.*speaker|jbl|bose.*speaker",
     "Bluetooth Speakers", "Audio & Music"),

    # --- Cookware ---
    (r"cookware|skillet|frying pan|sauce pan|dutch oven|cast iron.*pan|non.?stick.*pan",
     "Cookware", "Kitchen & Dining"),

    # --- Kitchen Gadgets ---
    (r"air fryer|blender|coffee maker|coffee grinder|toaster|instant pot|"
     r"food processor|juicer|kitchen gadget|can opener|peeler",
     "Kitchen Gadgets", "Kitchen & Dining"),
]

cur.execute("SELECT id, title FROM product WHERE deleted_at IS NULL")
products = cur.fetchall()

updated = 0
skipped = 0

for pid, title in products:
    title_lower = title.lower()
    matched_id = None

    for pattern, sub, parent in RULES:
        if re.search(pattern, title_lower):
            matched_id = cat_id(sub, parent)
            if matched_id:
                break

    if matched_id:
        cur.execute("UPDATE product SET category_id = ? WHERE id = ?", (matched_id, pid))
        updated += 1
        print(f"  [{pid}] {title[:55]:<55} -> {parent} > {sub}")
    else:
        skipped += 1
        print(f"  [{pid}] {title[:55]:<55} -> (no match)")

conn.commit()
conn.close()
print(f"\nDone. Updated: {updated}, No match: {skipped}")
