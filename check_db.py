import psycopg2

try:
    conn = psycopg2.connect('postgresql://postgres:XkckZgGerIaiEFGpZcSIPRUKLswqyVw@zephyr.proxy.rlwy.net:27424/railway')
    cur = conn.cursor()
    
    # Check if table exists
    cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'product')")
    print('Table exists:', cur.fetchone()[0])
    
    # Check count
    cur.execute("SELECT COUNT(*) FROM product")
    print('Product count:', cur.fetchone()[0])
    
    conn.close()
except Exception as e:
    print('Error:', e)