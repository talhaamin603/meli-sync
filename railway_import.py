import psycopg2
import csv

# Connect to Railway database
conn = psycopg2.connect('postgresql://postgres:XkckZgGerIaiEFGpZcSIPRUKLswqyVw@zephyr.proxy.rlwy.net:27424/railway')
cur = conn.cursor()

# Check current count
cur.execute('SELECT COUNT(*) FROM product')
print('Before import - Count:', cur.fetchone()[0])

# Read CSV and insert products
with open('products_FINAL_all.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    count = 0
    for row in reader:
        try:
            cur.execute("""
                INSERT INTO product (asin, title, description, image_url, amazon_price_usd, stock, is_prime, status) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending')
                ON CONFLICT (asin) DO NOTHING
            """, (
                row['asin'],
                row['title'],
                row.get('description', ''),
                row.get('image_url', ''),
                float(row['amazon_price_usd']),
                int(row.get('stock', 10)),
                row['is_prime'].lower() == 'true'
            ))
            count += 1
        except Exception as e:
            print(f'Error inserting {row.get("asin")}: {e}')
    
    conn.commit()
    print(f'Inserted/Updated: {count} products')

# Check new count
cur.execute('SELECT COUNT(*) FROM product')
print('After import - Count:', cur.fetchone()[0])

conn.close()